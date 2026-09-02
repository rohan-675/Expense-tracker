import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CalendarDays, CircleDollarSign, PlusCircle, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import CategoryIcon from "../components/CategoryIcon.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const Dashboard = () => {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data } = await api.get("/transactions");
        setTransactions(data);
      } catch (apiError) {
        setError(apiError.response?.data?.message || "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const summary = useMemo(() => {
    return transactions.reduce(
      (totals, transaction) => {
        if (transaction.type === "income") totals.income += transaction.amount;
        if (transaction.type === "expense") totals.expense += transaction.amount;
        totals.balance = totals.income - totals.expense;
        return totals;
      },
      { income: 0, expense: 0, balance: 0 }
    );
  }, [transactions]);

  const chartData = [
    { name: "Income", value: summary.income, fill: "#04a56d" },
    { name: "Expense", value: summary.expense, fill: "#e34861" }
  ];

  const categoryData = useMemo(() => {
    const totals = {};
    transactions.forEach((transaction) => {
      if (transaction.type === "expense") {
        totals[transaction.category] = (totals[transaction.category] || 0) + transaction.amount;
      }
    });

    return Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const monthMap = new Map();

    transactions.forEach((transaction) => {
      const label = new Date(transaction.date).toLocaleString("en-US", { month: "short" });
      const current = monthMap.get(label) || { month: label, income: 0, expense: 0 };
      current[transaction.type] += transaction.amount;
      monthMap.set(label, current);
    });

    return Array.from(monthMap.values()).slice(0, 6).reverse();
  }, [transactions]);

  const savingsRate = summary.income > 0 ? Math.round((summary.balance / summary.income) * 100) : 0;
  const topCategory = categoryData[0];
  const recentTransactions = transactions.slice(0, 6);
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());

  if (loading) return <div className="status-panel">Loading dashboard...</div>;
  if (error) return <div className="alert error">{error}</div>;

  return (
    <section className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome back, {user?.name?.split(" ")[0] || "there"}</h1>
          <p className="dashboard-subtitle">
            Your balance is {formatCurrency(summary.balance, currency)} with {transactions.length} tracked transactions.
          </p>
          <div className="dashboard-hero-actions">
            <Link className="primary-button" to="/add">
              <PlusCircle size={18} /> Add transaction
            </Link>
            <Link className="secondary-button" to="/reports">
              <CalendarDays size={18} /> Monthly report
            </Link>
          </div>
        </div>

        <div className="balance-showcase">
          <span>Current balance</span>
          <strong>{formatCurrency(summary.balance, currency)}</strong>
          <div className="balance-meter">
            <span style={{ width: `${Math.max(8, Math.min(100, savingsRate + 50))}%` }} />
          </div>
          <div className="balance-showcase-row">
            <small>Income {formatCurrency(summary.income, currency)}</small>
            <small>Expense {formatCurrency(summary.expense, currency)}</small>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard label="Total income" value={formatCurrency(summary.income, currency)} tone="income" />
        <StatCard label="Total expense" value={formatCurrency(summary.expense, currency)} tone="expense" />
        <StatCard label="Current balance" value={formatCurrency(summary.balance, currency)} tone="balance" />
      </div>

      <section className="insight-strip">
        <article className="insight-card">
          <span className="insight-icon"><Sparkles size={19} /></span>
          <div>
            <p>Top category</p>
            <strong>{topCategory ? topCategory.name : "No expenses"}</strong>
          </div>
        </article>
        <article className="insight-card">
          <span className="insight-icon"><Target size={19} /></span>
          <div>
            <p>Savings rate</p>
            <strong>{savingsRate}%</strong>
          </div>
        </article>
        <article className="insight-card">
          <span className="insight-icon"><CircleDollarSign size={19} /></span>
          <div>
            <p>Transactions</p>
            <strong>{transactions.length}</strong>
          </div>
        </article>
        <article className="insight-card">
          <span className="insight-icon">{summary.balance >= 0 ? <TrendingUp size={19} /> : <TrendingDown size={19} />}</span>
          <div>
            <p>Cash flow</p>
            <strong>{summary.balance >= 0 ? "Positive" : "Negative"}</strong>
          </div>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="chart-panel premium-chart">
          <div className="section-title">
            <h2>Income vs Expense</h2>
            <span className="mini-badge">{today}</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={5}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value, currency)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="chart-panel premium-chart">
          <div className="section-title">
            <h2>Monthly flow</h2>
            <span className="mini-badge">{monthlyData.length || 0} months</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData.length ? monthlyData : [{ month: "Now", income: 0, expense: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value, currency)} />
              <Legend />
              <Bar dataKey="income" fill="#04a56d" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#e34861" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="dashboard-grid dashboard-lower-grid">
        <section className="table-panel recent-panel">
          <div className="section-title">
            <h2>Recent transactions</h2>
            <Link className="text-link" to="/history">View all</Link>
          </div>
          <div className="transaction-list">
          {recentTransactions.map((transaction) => (
            <article className="transaction-row" key={transaction._id}>
              <div className="category-cell">
                <CategoryIcon category={transaction.category} type={transaction.type} />
                <span>
                  <strong>{transaction.category}</strong>
                  {transaction.walletId?.name && <small>{transaction.walletId.name}</small>}
                </span>
                <span>{formatDate(transaction.date)}</span>
              </div>
              <span className={`amount ${transaction.type}`}>
                {transaction.type === "income" ? "+" : "-"}
                {formatCurrency(transaction.amount, currency)}
              </span>
            </article>
          ))}
          {transactions.length === 0 && <p className="empty-state">No transactions yet.</p>}
        </div>
        </section>

        <section className="chart-panel category-panel">
          <div className="section-title">
            <h2>Top spending</h2>
            <Link className="text-link" to="/analytics">Details</Link>
          </div>
          <div className="category-rank-list">
            {categoryData.slice(0, 5).map((category, index) => (
              <article className="category-rank" key={category.name}>
                <span>{index + 1}</span>
                <div>
                  <strong>{category.name}</strong>
                  <div className="progress-track slim">
                    <span style={{ width: `${topCategory ? (category.amount / topCategory.amount) * 100 : 0}%` }} />
                  </div>
                </div>
                <b>{formatCurrency(category.amount, currency)}</b>
              </article>
            ))}
            {categoryData.length === 0 && <p className="empty-state">No category spending yet.</p>}
          </div>
        </section>
      </div>
    </section>
  );
};

export default Dashboard;
