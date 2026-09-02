import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import { addFrequency } from "../utils/dateUtils.js";
import { applyWalletImpact, getWalletForTransaction } from "./walletService.js";

export const processDueRecurringTransactions = async (userId) => {
  const now = new Date();
  const recurringItems = await RecurringTransaction.find({
    userId,
    active: true,
    nextRunAt: { $lte: now }
  });

  for (const item of recurringItems) {
    let nextRunAt = new Date(item.nextRunAt);

    while (nextRunAt <= now) {
      const wallet = await getWalletForTransaction(userId, item.walletId);

      await Transaction.create({
        userId,
        walletId: wallet._id,
        type: item.type,
        category: item.category,
        amount: item.amount,
        date: nextRunAt,
        description: item.description || `Recurring ${item.frequency} ${item.category}`,
        recurringId: item._id
      });

      await applyWalletImpact(wallet._id, item.type, item.amount);
      item.lastGeneratedAt = nextRunAt;
      nextRunAt = addFrequency(nextRunAt, item.frequency);
    }

    item.nextRunAt = nextRunAt;
    await item.save();
  }
};

