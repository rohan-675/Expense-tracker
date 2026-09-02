import React from "react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const Goals = () => {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: "", targetAmount: "", savedAmount: "", targetDate: "" });

  const fetchGoals = async () => {
    const { data } = await api.get("/goals");
    setGoals(data);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/goals", {
      ...form,
      targetAmount: Number(form.targetAmount),
      savedAmount: Number(form.savedAmount || 0)
    });
    setForm({ name: "", targetAmount: "", savedAmount: "", targetDate: "" });
    fetchGoals();
  };

  const handleDelete = async (id) => {
    await api.delete(`/goals/${id}`);
    fetchGoals();
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Savings goals</p>
        <h1>Turn big purchases into visible progress</h1>
      </div>

      <form className="filter-panel" onSubmit={handleSubmit}>
        <input placeholder="Goal name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input
          placeholder="Target amount"
          type="number"
          value={form.targetAmount}
          onChange={(event) => setForm({ ...form, targetAmount: event.target.value })}
        />
        <input
          placeholder="Saved amount"
          type="number"
          value={form.savedAmount}
          onChange={(event) => setForm({ ...form, savedAmount: event.target.value })}
        />
        <input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
        <button className="primary-button" type="submit">
          Add goal
        </button>
      </form>

      <section className="budget-grid">
        {goals.map((goal) => {
          const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
          return (
            <article className="budget-card" key={goal._id}>
              <div className="section-title">
                <h2>{goal.name}</h2>
                <button className="icon-button danger" type="button" onClick={() => handleDelete(goal._id)} aria-label="Delete goal">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="budget-meta">
                <span>Saved {formatCurrency(goal.savedAmount, currency)}</span>
                <span>Remaining {formatCurrency(goal.targetAmount - goal.savedAmount, currency)}</span>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
};

export default Goals;

