import Budget from "../models/Budget.js";
import SavingsGoal from "../models/SavingsGoal.js";
import Transaction from "../models/Transaction.js";
import { getMonthRange, getPreviousMonth } from "../utils/dateUtils.js";

// Single source of truth for every deterministic financial number the app
// shows anywhere (the /analytics page, the AI assistant, etc). Nothing here
// is AI-generated — it's plain aggregation over the authenticated user's
// own data, always scoped by userId. Reused by analyticsController and
// assistantService so the two can never disagree with each other.

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const summarize = (transactions) => {
  const totals = { income: 0, expense: 0, categoryTotals: {} };

  transactions.forEach((transaction) => {
    if (transaction.type === "income") totals.income += transaction.amount;
    if (transaction.type === "expense") {
      totals.expense += transaction.amount;
      totals.categoryTotals[transaction.category] =
        (totals.categoryTotals[transaction.category] || 0) + transaction.amount;
    }
  });

  const balance = totals.income - totals.expense;
  const savingsRate = totals.income > 0 ? round2((balance / totals.income) * 100) : 0;

  return {
    income: round2(totals.income),
    expense: round2(totals.expense),
    balance: round2(balance),
    savingsRate,
    categoryTotals: Object.fromEntries(
      Object.entries(totals.categoryTotals).map(([category, amount]) => [category, round2(amount)])
    )
  };
};

const categoryBreakdown = (summary) => {
  const total = summary.expense;
  return Object.entries(summary.categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? round2((amount / total) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Current + previous month totals, category breakdown, and the
 * month-over-month change — everything the "did I spend more this month"
 * class of question needs, computed once from real aggregated data instead
 * of an arbitrary slice of recent transactions.
 */
export const getMonthComparison = async (userId, month) => {
  const currentRange = getMonthRange(month);
  const previousRange = getMonthRange(getPreviousMonth(currentRange.month));

  const [currentTransactions, previousTransactions] = await Promise.all([
    Transaction.find({
      userId,
      date: { $gte: currentRange.start, $lt: currentRange.end }
    }),
    Transaction.find({
      userId,
      date: { $gte: previousRange.start, $lt: previousRange.end }
    })
  ]);

  const current = summarize(currentTransactions);
  const previous = summarize(previousTransactions);
  const expenseChange = round2(current.expense - previous.expense);
  const expenseChangePercentage =
    previous.expense > 0
      ? round2((expenseChange / previous.expense) * 100)
      : current.expense > 0
        ? 100
        : 0;

  return {
    month: currentRange.month,
    previousMonth: previousRange.month,
    current: { ...current, categories: categoryBreakdown(current) },
    previous: { ...previous, categories: categoryBreakdown(previous) },
    expenseChange,
    expenseChangePercentage,
    spendingTrend: expenseChange > 0 ? "increased" : expenseChange < 0 ? "decreased" : "same"
  };
};

/**
 * Aggregated monthly totals for the trailing N months (default 6), via a
 * single Mongo aggregation rather than loading every transaction into
 * memory — this is what "how has my spending changed over time" needs.
 */
export const getMonthlyTrend = async (userId, monthsBack = 6) => {
  const end = getMonthRange().start; // start of the current month
  const start = new Date(end);
  start.setMonth(start.getMonth() - monthsBack);

  const rows = await Transaction.aggregate([
    { $match: { userId, date: { $gte: start, $lt: new Date() } } },
    {
      $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" }, type: "$type" },
        total: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const byMonth = new Map();
  rows.forEach((row) => {
    const key = `${row._id.year}-${String(row._id.month).padStart(2, "0")}`;
    const entry = byMonth.get(key) || { month: key, income: 0, expense: 0 };
    entry[row._id.type] = round2(row.total);
    byMonth.set(key, entry);
  });

  return [...byMonth.values()].map((entry) => ({ ...entry, balance: round2(entry.income - entry.expense) }));
};

/**
 * Budget usage for a given month, reusing the exact same spent/remaining/
 * exceeded logic as GET /api/budgets so the assistant can never report a
 * different number than the Budgets page.
 */
export const getBudgetStatus = async (userId, month) => {
  const { start, end, month: resolvedMonth } = getMonthRange(month);
  const budgets = await Budget.find({ userId, month: resolvedMonth });

  if (budgets.length === 0) return [];

  const expenses = await Transaction.aggregate([
    { $match: { userId, type: "expense", date: { $gte: start, $lt: end } } },
    { $group: { _id: "$category", spent: { $sum: "$amount" } } }
  ]);
  const spentByCategory = new Map(expenses.map((item) => [item._id.toLowerCase(), item.spent]));

  return budgets.map((budget) => {
    const spent = round2(spentByCategory.get(budget.category.toLowerCase()) || 0);
    return {
      category: budget.category,
      amount: budget.amount,
      spent,
      remaining: round2(budget.amount - spent),
      percentageUsed: budget.amount > 0 ? round2((spent / budget.amount) * 100) : 0,
      exceeded: spent > budget.amount
    };
  });
};

export const getSavingsGoalsStatus = async (userId) => {
  const goals = await SavingsGoal.find({ userId }).sort({ createdAt: -1 });

  return goals.map((goal) => ({
    name: goal.name,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    remaining: round2(goal.targetAmount - goal.savedAmount),
    progressPercentage: goal.targetAmount > 0 ? round2((goal.savedAmount / goal.targetAmount) * 100) : 0
  }));
};
