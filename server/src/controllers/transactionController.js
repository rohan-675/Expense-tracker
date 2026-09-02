import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import {
  applyWalletImpact,
  getWalletForTransaction,
  reverseWalletImpact
} from "../services/walletService.js";
import { processDueRecurringTransactions } from "../services/recurringService.js";
import { deleteReceiptFile, saveReceiptFile } from "../services/storageService.js";

const getFilterQuery = (req) => {
  const { type, category, startDate, endDate, walletId } = req.query;
  const query = { userId: req.user._id };

  if (type && ["income", "expense"].includes(type)) {
    query.type = type;
  }

  if (category) {
    query.category = new RegExp(category, "i");
  }

  if (walletId) {
    query.walletId = walletId;
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  return query;
};

export const getTransactions = async (req, res, next) => {
  try {
    await processDueRecurringTransactions(req.user._id);

    const transactions = await Transaction.find(getFilterQuery(req))
      .populate("walletId", "name type")
      .sort({
        date: -1,
        createdAt: -1
      });

    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

export const addTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, date, description, walletId } = req.body;

    if (!type || !category || !amount || !date) {
      res.status(400);
      throw new Error("Type, category, amount, and date are required");
    }

    const wallet = await getWalletForTransaction(req.user._id, walletId);
    const transaction = await Transaction.create({
      userId: req.user._id,
      walletId: wallet._id,
      type,
      category,
      amount,
      date,
      description
    });

    await applyWalletImpact(wallet._id, type, amount);
    await transaction.populate("walletId", "name type");

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Invalid transaction id");
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      res.status(404);
      throw new Error("Transaction not found");
    }

    await reverseWalletImpact(transaction.walletId, transaction.type, transaction.amount);

    const nextWallet = await getWalletForTransaction(req.user._id, req.body.walletId || transaction.walletId);
    transaction.walletId = nextWallet._id;

    const allowedFields = ["type", "category", "amount", "date", "description"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        transaction[field] = req.body[field];
      }
    });

    const updatedTransaction = await transaction.save();
    await applyWalletImpact(updatedTransaction.walletId, updatedTransaction.type, updatedTransaction.amount);
    await updatedTransaction.populate("walletId", "name type");
    res.json(updatedTransaction);
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Invalid transaction id");
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      res.status(404);
      throw new Error("Transaction not found");
    }

    await reverseWalletImpact(transaction.walletId, transaction.type, transaction.amount);

    if (transaction.receipt?.fileName) deleteReceiptFile(transaction.receipt.fileName);

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const uploadReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error("Receipt file is required");
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      res.status(404);
      throw new Error("Transaction not found");
    }

    const previousFileName = transaction.receipt?.fileName;
    const { fileName, url } = await saveReceiptFile(req.file);

    transaction.receipt = {
      originalName: req.file.originalname,
      fileName,
      mimeType: req.file.mimetype,
      url,
      size: req.file.size
    };

    const updatedTransaction = await transaction.save();

    // Clean up the file being replaced, if any. Best-effort — failure here
    // shouldn't fail the request since the new receipt already saved fine.
    if (previousFileName) deleteReceiptFile(previousFileName);

    await updatedTransaction.populate("walletId", "name type");
    res.json(updatedTransaction);
  } catch (error) {
    next(error);
  }
};
