import express from "express";
import {
  getCurrentUser,
  googleLogin,
  loginUser,
  logoutUser,
  registerUser,
  resendVerificationEmail,
  updateUserCurrency,
  verifyEmail
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please try again later.",
  keyPrefix: "auth"
});

// Separate, tighter limiter specifically for resending verification emails
// — this endpoint sends real email, so it needs its own cap independent of
// the general auth limiter to prevent it being used to spam one inbox.
const resendVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: "Too many verification email requests. Please try again later.",
  keyPrefix: "resend-verification"
});

router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);
router.post("/google", authRateLimiter, googleLogin);
router.post("/logout", logoutUser);
router.get("/me", protect, getCurrentUser);
router.patch("/profile/currency", protect, updateUserCurrency);
router.post("/verify-email", authRateLimiter, verifyEmail);
router.post("/resend-verification", resendVerificationRateLimiter, resendVerificationEmail);

export default router;
