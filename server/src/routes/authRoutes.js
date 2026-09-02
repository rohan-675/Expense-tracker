import express from "express";
import {
  getCurrentUser,
  googleLogin,
  loginUser,
  logoutUser,
  registerUser,
  updateUserCurrency
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

router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);
router.post("/google", authRateLimiter, googleLogin);
router.post("/logout", logoutUser);
router.get("/me", protect, getCurrentUser);
router.patch("/profile/currency", protect, updateUserCurrency);

export default router;
