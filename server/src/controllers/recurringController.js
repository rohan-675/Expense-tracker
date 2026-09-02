import RecurringTransaction from "../models/RecurringTransaction.js";
import { addFrequency } from "../utils/dateUtils.js";
import { getWalletForTransaction } from "../services/walletService.js";
import { processDueRecurringTransactions } from "../services/recurringService.js";

export const getRecurringTransactions = async (req, res, next) => {
  try {
    await processDueRecurringTransactions(req.user._id);
    const recurring = await RecurringTransaction.find({ userId: req.user._id })
      .populate("walletId", "name type")
      .sort({ createdAt: -1 });
    res.json(recurring);
  } catch (error) {
    next(error);
  }
};

export const createRecurringTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, frequency, startDate, description, walletId } = req.body;

    if (!type || !category || !amount || !frequency || !startDate) {
      res.status(400);
      throw new Error("Type, category, amount, frequency, and start date are required");
    }

    const wallet = await getWalletForTransaction(req.user._id, walletId);
    const firstRun = new Date(startDate);

    const recurring = await RecurringTransaction.create({
      userId: req.user._id,
      walletId: wallet._id,
      type,
      category,
      amount,
      frequency,
      startDate: firstRun,
      nextRunAt: firstRun,
      description
    });

    await recurring.populate("walletId", "name type");
    res.status(201).json(recurring);
  } catch (error) {
    next(error);
  }
};

export const updateRecurringTransaction = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.findOne({ _id: req.params.id, userId: req.user._id });

    if (!recurring) {
      res.status(404);
      throw new Error("Recurring transaction not found");
    }

    if (req.body.walletId !== undefined) {
      const wallet = await getWalletForTransaction(req.user._id, req.body.walletId);
      recurring.walletId = wallet._id;
    }

    ["type", "category", "amount", "frequency", "startDate", "description", "active"].forEach((field) => {
      if (req.body[field] !== undefined) recurring[field] = req.body[field];
    });

    if (req.body.startDate || req.body.frequency) {
      recurring.nextRunAt = addFrequency(new Date(recurring.startDate), recurring.frequency);
    }

    const updatedRecurring = await recurring.save();
    await updatedRecurring.populate("walletId", "name type");
    res.json(updatedRecurring);
  } catch (error) {
    next(error);
  }
};

export const deleteRecurringTransaction = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!recurring) {
      res.status(404);
      throw new Error("Recurring transaction not found");
    }

    res.json({ message: "Recurring transaction deleted successfully" });
  } catch (error) {
    next(error);
  }
};

