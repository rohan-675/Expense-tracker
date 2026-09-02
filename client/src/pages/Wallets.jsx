import React from "react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const Wallets = () => {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState({ name: "", type: "cash", initialBalance: "" });
  const [error, setError] = useState("");

  const fetchWallets = async () => {
    const { data } = await api.get("/wallets");
    setWallets(data);
  };

  useEffect(() => {
    fetchWallets().catch((apiError) => setError(apiError.response?.data?.message || "Unable to load wallets"));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/wallets", { ...form, initialBalance: Number(form.initialBalance || 0) });
    setForm({ name: "", type: "cash", initialBalance: "" });
    fetchWallets();
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/wallets/${id}`);
      fetchWallets();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to delete wallet");
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Multi-wallet</p>
        <h1>Track cash, bank, UPI, and cards separately</h1>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="filter-panel" onSubmit={handleSubmit}>
        <input placeholder="Wallet name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="upi">UPI</option>
          <option value="credit_card">Credit Card</option>
          <option value="other">Other</option>
        </select>
        <input
          placeholder="Opening balance"
          type="number"
          value={form.initialBalance}
          onChange={(event) => setForm({ ...form, initialBalance: event.target.value })}
        />
        <button className="primary-button" type="submit">
          Add wallet
        </button>
      </form>

      <section className="stats-grid">
        {wallets.map((wallet) => (
          <article className="wallet-card" key={wallet._id}>
            <div>
              <p>{wallet.type.replace("_", " ")}</p>
              <h2>{wallet.name}</h2>
            </div>
            <strong>{formatCurrency(wallet.balance, currency)}</strong>
            <button className="icon-button danger" type="button" onClick={() => handleDelete(wallet._id)} aria-label="Delete wallet">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </section>
    </section>
  );
};

export default Wallets;

