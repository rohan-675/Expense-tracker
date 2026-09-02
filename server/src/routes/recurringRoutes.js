import express from "express";
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction
} from "../controllers/recurringController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getRecurringTransactions).post(protect, createRecurringTransaction);
router.route("/:id").put(protect, updateRecurringTransaction).delete(protect, deleteRecurringTransaction);

export default router;

