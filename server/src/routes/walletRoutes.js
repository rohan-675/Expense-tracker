import express from "express";
import { createWallet, deleteWallet, getWallets, updateWallet } from "../controllers/walletController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getWallets).post(protect, createWallet);
router.route("/:id").put(protect, updateWallet).delete(protect, deleteWallet);

export default router;

