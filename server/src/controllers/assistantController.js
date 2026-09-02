import { AssistantError, askAiProvider, buildFinancialContext, validateQuestion } from "../services/assistantService.js";

// Used only when OPENAI_API_KEY isn't configured, so the assistant page
// still works out of the box (same behavior as before this refactor) —
// built from the exact same deterministic context the real AI would get,
// so it can never disagree with the rest of the app either. The controller
// already guarantees hasAnyTransactions is true before calling this.
const buildLocalFallbackAnswer = (context) => {
  const topCategory = context.categorySpending[0];
  const lines = [
    `This month you've earned ${context.currentMonth.income} and spent ${context.currentMonth.expenses} in ${context.currency}, leaving a balance of ${context.currentMonth.balance}.`,
    topCategory
      ? `Your top spending category is ${topCategory.category} at ${topCategory.percentage}% of your expenses.`
      : "You don't have any categorized expenses yet this month.",
    `Your savings rate this month is ${context.currentMonth.savingsRate}%.`,
    context.monthOverMonth.trend !== "same"
      ? `Compared with last month, your spending has ${context.monthOverMonth.trend} by ${context.monthOverMonth.expenseChangePercentage}%.`
      : null,
    "Note: the full AI assistant isn't configured, so this is a simple automatic summary rather than a tailored answer to your question."
  ].filter(Boolean);

  return lines.join(" ");
};

export const askAssistant = async (req, res, next) => {
  try {
    // req.user is set exclusively by the `protect` auth middleware from the
    // verified JWT — the request body's userId (if any) is never read or
    // trusted, so one user can never trigger a lookup of another user's data.
    const question = validateQuestion(req.body?.question);
    const context = await buildFinancialContext(req.user._id, req.user.currency);

    // Skip the AI call entirely when there's nothing to analyze yet. This
    // guarantees the exact "add some transactions" message every time
    // (rather than hoping the model follows that instruction) and avoids
    // spending an API call on a question we already know has no real answer.
    if (!context.hasAnyTransactions) {
      res.json({
        answer: "You don't have enough expense data yet. Add some transactions and I'll help analyze your spending.",
        mode: "empty"
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.json({ answer: buildLocalFallbackAnswer(context), mode: "local" });
      return;
    }

    const answer = await askAiProvider(question, context);
    res.json({ answer, mode: "openai" });
  } catch (error) {
    if (error instanceof AssistantError) {
      // Log the real cause server-side only; the client gets the safe
      // message already attached to the error.
      if (error.cause) console.error("Assistant provider error:", error.cause);
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    next(error);
  }
};
