import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import { getMonthRange } from "../utils/dateUtils.js";

export const getBudgets = async (req, res, next) => {
  try {
    const { start, end, month } = getMonthRange(req.query.month);
    const budgets = await Budget.find({ userId: req.user._id, month }).sort({ category: 1 });
    const expenses = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: "expense",
          date: { $gte: start, $lt: end }
        }
      },
      { $group: { _id: "$category", spent: { $sum: "$amount" } } }
    ]);

    const spentByCategory = new Map(expenses.map((item) => [item._id.toLowerCase(), item.spent]));
    const result = budgets.map((budget) => {
      const spent = spentByCategory.get(budget.category.toLowerCase()) || 0;
      return {
        ...budget.toObject(),
        spent,
        remaining: budget.amount - spent,
        exceeded: spent > budget.amount
      };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const upsertBudget = async (req, res, next) => {
  try {
    const { category, amount, month } = req.body;

    if (!category || !amount || !month) {
      res.status(400);
      throw new Error("Category, amount, and month are required");
    }

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, category, month },
      { userId: req.user._id, category, amount, month },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
};

export const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!budget) {
      res.status(404);
      throw new Error("Budget not found");
    }

    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    next(error);
  }
};

