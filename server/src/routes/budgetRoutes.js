import express from "express";
import { deleteBudget, getBudgets, upsertBudget } from "../controllers/budgetController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getBudgets).post(protect, upsertBudget);
router.route("/:id").delete(protect, deleteBudget);

export default router;

