import React from "react";
import { useEffect, useState } from "react";
import api from "../api/axios.js";
import TransactionForm from "../components/TransactionForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const AddTransaction = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    api.get("/wallets").then(({ data }) => setWallets(data)).catch(() => setWallets([]));
  }, []);

  const handleSubmit = async (payload) => {
    try {
      setError("");
      const { receiptFile, ...transactionPayload } = payload;
      const { data } = await api.post("/transactions", transactionPayload);

      if (receiptFile) {
        const formData = new FormData();
        formData.append("receipt", receiptFile);
        await api.post(`/transactions/${data._id}/receipt`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setMessage("Transaction added successfully");
    } catch (apiError) {
      setMessage("");
      setError(apiError.response?.data?.message || "Unable to save transaction");
    }
  };

  return (
    <section className="narrow-page page-stack">
      <div className="page-heading">
        <p className="eyebrow">Add transaction</p>
        <h1>Record income or expense</h1>
      </div>
      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}
      <TransactionForm currency={user?.currency} wallets={wallets} showReceipt onSubmit={handleSubmit} />
    </section>
  );
};

export default AddTransaction;
