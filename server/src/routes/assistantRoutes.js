import express from "express";
import { askAssistant } from "../controllers/assistantController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// This endpoint can call the OpenAI API, so it gets a tighter limit than
// the rest of the app to avoid runaway usage costs and abuse.
const assistantRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many assistant requests. Please slow down and try again shortly.",
  keyPrefix: "assistant"
});

router.post("/ask", protect, assistantRateLimiter, askAssistant);

export default router;

