import { getMonthComparison } from "../services/financialAnalyticsService.js";

export const getAnalytics = async (req, res, next) => {
  try {
    const comparison = await getMonthComparison(req.user._id, req.query.month);

    // Preserve the existing response shape so the frontend (SmartAnalytics
    // page, charts, etc.) doesn't need any changes.
    res.json({
      month: comparison.month,
      previousMonth: comparison.previousMonth,
      current: {
        income: comparison.current.income,
        expense: comparison.current.expense,
        balance: comparison.current.balance,
        categoryTotals: comparison.current.categoryTotals,
        savingsPercentage: comparison.current.savingsRate
      },
      previous: {
        income: comparison.previous.income,
        expense: comparison.previous.expense,
        balance: comparison.previous.balance,
        categoryTotals: comparison.previous.categoryTotals,
        savingsPercentage: comparison.previous.savingsRate
      },
      insights: {
        highestSpendingCategory: comparison.current.categories[0]
          ? { category: comparison.current.categories[0].category, amount: comparison.current.categories[0].amount }
          : null,
        savingsPercentage: comparison.current.savingsRate,
        expenseChange: comparison.expenseChange,
        expenseChangePercentage: comparison.expenseChangePercentage,
        spendingTrend: comparison.spendingTrend
      }
    });
  } catch (error) {
    next(error);
  }
};
