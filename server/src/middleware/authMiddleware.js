import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { COOKIE_NAME } from "../utils/authCookie.js";

export const protect = async (req, res, next) => {
  try {
    // Prefer the httpOnly cookie (used by the web app). Also accept a
    // Bearer header so the API remains easy to test directly (curl,
    // Postman, mobile clients, etc.) without a browser cookie jar.
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const token = req.cookies?.[COOKIE_NAME] || bearerToken;

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, token missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    // Defense-in-depth: normal signup/login already prevent an unverified
    // local account from ever obtaining a valid session cookie, but this
    // guarantees it's enforced here too, at the one place every protected
    // route passes through — not just at the login form.
    if (!user.emailVerified) {
      res.status(403);
      throw new Error("Please verify your email before continuing.");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(res.statusCode === 200 ? 401 : res.statusCode);
    next(error);
  }
};

