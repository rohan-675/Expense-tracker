import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { isAllowedCurrency } from "../utils/currencies.js";
import { isValidEmailFormat } from "../utils/validateEmail.js";
import { OAuth2Client } from "google-auth-library";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";
import { generateVerificationToken, hashToken } from "../utils/verificationToken.js";
import { sendVerificationEmail } from "../services/emailService.js";

// The cookie is still the primary session mechanism (works transparently
// for browsers that accept cross-site cookies, and survives page refresh).
// The token is ALSO included in this response body as a fallback: some
// browsers reject a cross-site Secure/SameSite=None cookie outright
// (third-party-cookie blocking is now common even in regular, non-Incognito
// Chrome, not just Safari/Incognito) — when that happens, the cookie never
// gets stored and every subsequent request would otherwise fail with "not
// authorized" immediately after a successful login. The frontend holds
// this token ONLY in memory (never localStorage/sessionStorage) and
// attaches it as a Bearer header, which `protect` already accepts as a
// fallback behind the cookie check. This does not persist across a full
// page reload if the cookie itself didn't stick — but it fixes the
// far more common case of the current tab/session being unusable
// immediately after logging in.
const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  currency: user.currency || "USD",
  emailVerified: user.emailVerified
});

const respondWithSession = (res, user, status = 200) => {
  const token = generateToken(user._id);
  setAuthCookie(res, token);
  res.status(status).json({ ...userResponse(user), token });
};

const issueVerificationEmail = async (user) => {
  const { rawToken, tokenHash, expiresAt } = generateVerificationToken();
  user.verificationTokenHash = tokenHash;
  user.verificationTokenExpiry = expiresAt;
  await user.save();

  try {
    await sendVerificationEmail({ to: user.email, name: user.name, rawToken });
  } catch (emailError) {
    // Registration/account state should still succeed even if the email
    // provider is temporarily down — the user can use "resend verification
    // email" once it's back. Log the real cause server-side only.
    console.error("Failed to send verification email:", emailError);
    throw Object.assign(new Error("Account created, but the verification email failed to send. Please use \"resend verification email\" shortly."), {
      statusCode: 502
    });
  }
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, currency = "USD" } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email, and password are required");
    }

    if (!isValidEmailFormat(email)) {
      res.status(400);
      throw new Error("Enter a valid email address");
    }

    const normalizedCurrency = String(currency).toUpperCase();
    if (!isAllowedCurrency(normalizedCurrency)) {
      res.status(400);
      throw new Error("Selected currency is not supported");
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      res.status(409);
      throw new Error("An account with this email already exists");
    }

    const user = await User.create({
      name,
      email,
      password,
      currency: normalizedCurrency,
      emailVerified: false
    });

    try {
      await issueVerificationEmail(user);
    } catch (emailError) {
      // Account was created; only the email step failed. Report that
      // distinct, less-severe outcome rather than a generic 500.
      res.status(emailError.statusCode || 502);
      throw emailError;
    }

    // Deliberately does NOT log the user in (no cookie set) — an unverified
    // account must not be usable yet, per the verification requirement.
    res.status(201).json({
      message: "Account created. Please check your email to verify your account before logging in.",
      email: user.email
    });
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    if (!user.emailVerified) {
      res.status(403);
      throw new Error("Please verify your email before logging in.");
    }

    respondWithSession(res, user);
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const rawToken = req.body?.token || req.query?.token;

    if (!rawToken || typeof rawToken !== "string") {
      res.status(400);
      throw new Error("Verification token is required");
    }

    const user = await User.findOne({
      verificationTokenHash: hashToken(rawToken),
      verificationTokenExpiry: { $gt: new Date() }
    }).select("+verificationTokenHash +verificationTokenExpiry");

    if (!user) {
      res.status(400);
      throw new Error("This verification link is invalid or has expired. Please request a new one.");
    }

    if (user.emailVerified) {
      // Shouldn't normally happen since the token is cleared on success,
      // but handle it cleanly rather than erroring if it's ever replayed.
      res.status(200);
      res.json({ message: "This account is already verified. You can log in." });
      return;
    }

    user.emailVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    // Log the user straight in after verifying — they've just proven email
    // ownership, so there's no reason to make them log in a second time.
    respondWithSession(res, user);
  } catch (error) {
    next(error);
  }
};

export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmailFormat(email)) {
      res.status(400);
      throw new Error("Enter a valid email address");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond the same way regardless of whether the account exists
    // or is already verified — telling the caller which case it was would
    // let this endpoint be used to check which emails are registered.
    const genericResponse = {
      message: "If an account with that email exists and isn't verified yet, a new verification email has been sent."
    };

    if (!user || user.emailVerified || user.authProvider !== "local") {
      res.json(genericResponse);
      return;
    }

    await issueVerificationEmail(user);
    res.json(genericResponse);
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
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      // google-auth-library gives a specific, useful reason here (expired
      // token, audience/client-ID mismatch, wrong issuer, malformed JWT,
      // clock skew, etc). Logging it is what actually lets a "works on
      // some devices" report get root-caused next time it happens, instead
      // of only ever seeing a generic "Unable to verify Google account".
      console.error("Google ID token verification failed:", verifyError.message);
      res.status(401);
      throw new Error("Unable to verify Google account");
    }

    if (!payload?.email) {
      res.status(401);
      throw new Error("Unable to verify Google account");
    }

    if (payload.email_verified === false) {
      // Extremely rare (Google-issued tokens are normally already verified)
      // but if Google itself says the email isn't verified, don't trust it.
      res.status(401);
      throw new Error("Your Google account's email is not verified");
    }

    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      const normalizedCurrency = isAllowedCurrency(currency) ? String(currency).toUpperCase() : "USD";
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub,
        authProvider: "google",
        currency: normalizedCurrency,
        emailVerified: true // Google already proved ownership of this email
      });
    } else {
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = payload.sub;
        needsSave = true;
      }
      if (!user.emailVerified) {
        // Signing in with Google for an email that already has a local,
        // unverified account counts as proof of ownership — grandfather it
        // in rather than leaving the user stuck on a "please verify" wall
        // they have no way to clear via this login path.
        user.emailVerified = true;
        needsSave = true;
      }
      if (needsSave) await user.save();
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
