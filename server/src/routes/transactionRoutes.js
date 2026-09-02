import express from "express";
import {
  addTransaction,
  deleteTransaction,
  getTransactions,
  uploadReceipt,
  updateTransaction
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadReceiptFile } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getTransactions).post(protect, addTransaction);
router.route("/:id").put(protect, updateTransaction).delete(protect, deleteTransaction);
router.post("/:id/receipt", protect, uploadReceiptFile.single("receipt"), uploadReceipt);

export default router;
