import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const currentMonth = new Date().toISOString().slice(0, 7);

const SmartAnalytics = () => {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [month, setMonth] = useState(currentMonth);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get(`/analytics?month=${month}`).then(({ data }) => setAnalytics(data));
  }, [month]);

  const trendIcon = analytics?.insights.spendingTrend === "increased" ? <TrendingUp size={22} /> : <TrendingDown size={22} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Smart analytics</p>
        <h1>See what changed, what grew, and where money went</h1>
      </div>

      <section className="filter-panel">
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </section>

      {analytics && (
        <>
          <div className="stats-grid">
            <article className="stat-card expense">
              <p>Highest category</p>
              <strong>
                {analytics.insights.highestSpendingCategory
                  ? analytics.insights.highestSpendingCategory.category
                  : "No expenses"}
              </strong>
            </article>
            <article className="stat-card balance">
              <p>Savings percentage</p>
              <strong>{analytics.insights.savingsPercentage}%</strong>
            </article>
            <article className="stat-card income">
              <p>Monthly expense trend</p>
              <strong className="trend-value">
                {trendIcon} {analytics.insights.expenseChangePercentage}%
              </strong>
            </article>
          </div>

          <section className="table-panel insight-panel">
            <h2>Insight summary</h2>
            <p>
              Spending {analytics.insights.spendingTrend} by{" "}
              {formatCurrency(Math.abs(analytics.insights.expenseChange), currency)} compared with{" "}
              {analytics.previousMonth}.
            </p>
            {analytics.insights.highestSpendingCategory && (
              <p>
                Your biggest category is {analytics.insights.highestSpendingCategory.category} at{" "}
                {formatCurrency(analytics.insights.highestSpendingCategory.amount, currency)}.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  );
};

export default SmartAnalytics;

