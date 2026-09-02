import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { isAllowedCurrency } from "../utils/currencies.js";
import { OAuth2Client } from "google-auth-library";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";

// The token itself now lives only in the httpOnly cookie, never in the
// JSON body, so client-side JS (and therefore XSS) can't read it out of
// localStorage. The frontend only ever sees this plain user profile.
const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  currency: user.currency || "USD"
});

const respondWithSession = (res, user, status = 200) => {
  const token = generateToken(user._id);
  setAuthCookie(res, token);
  res.status(status).json(userResponse(user));
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, currency = "USD" } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email, and password are required");
    }

    const normalizedCurrency = String(currency).toUpperCase();
    if (!isAllowedCurrency(normalizedCurrency)) {
      res.status(400);
      throw new Error("Selected currency is not supported");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(409);
      throw new Error("An account with this email already exists");
    }

    const user = await User.create({ name, email, password, currency: normalizedCurrency });
    respondWithSession(res, user, 201);
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    respondWithSession(res, user);
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { credential, currency = "USD" } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      res.status(500);
      throw new Error("Google login is not configured");
    }

    if (!credential) {
      res.status(400);
      throw new Error("Google credential is required");
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      res.status(401);
      throw new Error("Unable to verify Google account");
    }

    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      const normalizedCurrency = isAllowedCurrency(currency) ? String(currency).toUpperCase() : "USD";
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub,
        authProvider: "google",
        currency: normalizedCurrency
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    respondWithSession(res, user);
  } catch (error) {
    next(error);
  }
};

// Lets the frontend silently restore a session on page load/refresh by
// checking the httpOnly cookie, since JS can no longer read the token
// itself out of storage to decide whether the user is logged in.
export const getCurrentUser = async (req, res, next) => {
  try {
    res.json(userResponse(req.user));
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (_req, res, next) => {
  try {
    clearAuthCookie(res);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateUserCurrency = async (req, res, next) => {
  try {
    const normalizedCurrency = String(req.body.currency || "").toUpperCase();

    if (!isAllowedCurrency(normalizedCurrency)) {
      res.status(400);
      throw new Error("Selected currency is not supported");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.currency = normalizedCurrency;
    const updatedUser = await user.save();

    res.json(userResponse(updatedUser));
  } catch (error) {
    next(error);
  }
};
