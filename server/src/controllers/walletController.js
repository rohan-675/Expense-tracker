import Wallet from "../models/Wallet.js";
import { ensureDefaultWallet } from "../services/walletService.js";

export const getWallets = async (req, res, next) => {
  try {
    await ensureDefaultWallet(req.user._id);
    const wallets = await Wallet.find({ userId: req.user._id }).sort({ createdAt: 1 });
    res.json(wallets);
  } catch (error) {
    next(error);
  }
};

export const createWallet = async (req, res, next) => {
  try {
    const { name, type = "cash", initialBalance = 0 } = req.body;

    if (!name) {
      res.status(400);
      throw new Error("Wallet name is required");
    }

    const wallet = await Wallet.create({
      userId: req.user._id,
      name,
      type,
      initialBalance,
      balance: initialBalance
    });

    res.status(201).json(wallet);
  } catch (error) {
    next(error);
  }
};

export const updateWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ _id: req.params.id, userId: req.user._id });

    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    ["name", "type"].forEach((field) => {
      if (req.body[field] !== undefined) wallet[field] = req.body[field];
    });

    const updatedWallet = await wallet.save();
    res.json(updatedWallet);
  } catch (error) {
    next(error);
  }
};

export const deleteWallet = async (req, res, next) => {
  try {
    const walletCount = await Wallet.countDocuments({ userId: req.user._id });
    if (walletCount <= 1) {
      res.status(400);
      throw new Error("At least one wallet is required");
    }

    const wallet = await Wallet.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    res.json({ message: "Wallet deleted successfully" });
  } catch (error) {
    next(error);
  }
};

