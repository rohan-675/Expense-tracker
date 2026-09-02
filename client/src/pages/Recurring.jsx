import React from "react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const Recurring = () => {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [items, setItems] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState({
    type: "expense",
    category: "",
    amount: "",
    frequency: "monthly",
    startDate: new Date().toISOString().slice(0, 10),
    description: "",
    walletId: ""
  });

  const fetchData = async () => {
    const [{ data: recurringData }, { data: walletData }] = await Promise.all([
      api.get("/recurring"),
      api.get("/wallets")
    ]);
    setItems(recurringData);
    setWallets(walletData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/recurring", { ...form, amount: Number(form.amount) });
    setForm({ ...form, category: "", amount: "", description: "" });
    fetchData();
  };

  const handleDelete = async (id) => {
    await api.delete(`/recurring/${id}`);
    fetchData();
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Recurring expenses</p>
        <h1>Automate rent, salary, and subscriptions</h1>
      </div>

      <form className="form-panel recurring-form" onSubmit={handleSubmit}>
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input name="category" placeholder="Category" value={form.category} onChange={handleChange} />
        <input name="amount" placeholder="Amount" type="number" value={form.amount} onChange={handleChange} />
        <select name="frequency" value={form.frequency} onChange={handleChange}>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
        <input name="startDate" type="date" value={form.startDate} onChange={handleChange} />
        <select name="walletId" value={form.walletId} onChange={handleChange}>
          <option value="">Main wallet</option>
          {wallets.map((wallet) => (
            <option key={wallet._id} value={wallet._id}>
              {wallet.name}
            </option>
          ))}
        </select>
        <input name="description" placeholder="Description" value={form.description} onChange={handleChange} />
        <button className="primary-button" type="submit">
          Add recurring
        </button>
      </form>

      <section className="table-panel responsive-table">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Frequency</th>
              <th>Next run</th>
              <th>Wallet</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td><span className={`badge ${item.type}`}>{item.type}</span></td>
                <td>{item.category}</td>
                <td>{formatCurrency(item.amount, currency)}</td>
                <td>{item.frequency}</td>
                <td>{formatDate(item.nextRunAt)}</td>
                <td>{item.walletId?.name || "Main Wallet"}</td>
                <td>
                  <button className="icon-button danger" type="button" onClick={() => handleDelete(item._id)} aria-label="Delete recurring transaction">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
};

export default Recurring;

