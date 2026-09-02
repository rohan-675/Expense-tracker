import React from "react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const currentMonth = new Date().toISOString().slice(0, 7);

const Budgets = () => {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState({ category: "", amount: "" });
  const [error, setError] = useState("");

  const fetchBudgets = async () => {
    const { data } = await api.get(`/budgets?month=${month}`);
    setBudgets(data);
  };

  useEffect(() => {
    fetchBudgets().catch((apiError) => setError(apiError.response?.data?.message || "Unable to load budgets"));
  }, [month]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setError("");
      await api.post("/budgets", { ...form, amount: Number(form.amount), month });
      setForm({ category: "", amount: "" });
      fetchBudgets();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to save budget");
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/budgets/${id}`);
    fetchBudgets();
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Budget tracker</p>
        <h1>Control each category before it controls you</h1>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="filter-panel" onSubmit={handleSubmit}>
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <input
          placeholder="Category"
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value })}
        />
        <input
          min="1"
          placeholder="Budget amount"
          type="number"
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
        <button className="primary-button" type="submit">
          Save budget
        </button>
      </form>

      <section className="table-panel budget-grid">
        {budgets.map((budget) => {
          const used = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
          return (
            <article className={`budget-card ${budget.exceeded ? "over" : ""}`} key={budget._id}>
              <div className="section-title">
                <h2>{budget.category}</h2>
                <button className="icon-button danger" type="button" onClick={() => handleDelete(budget._id)} aria-label="Delete budget">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="progress-track">
                <span style={{ width: `${used}%` }} />
              </div>
              <div className="budget-meta">
                <span>Used {formatCurrency(budget.spent, currency)}</span>
                <span>Remaining {formatCurrency(budget.remaining, currency)}</span>
              </div>
              {budget.exceeded && <strong className="warning-text">Budget exceeded</strong>}
            </article>
          );
        })}
        {budgets.length === 0 && <p className="empty-state">No budgets set for this month.</p>}
      </section>
    </section>
  );
};

export default Budgets;

