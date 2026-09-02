import React from "react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { currencies } from "../utils/currencies.js";

const Account = () => {
  const { updateCurrency, user } = useAuth();
  const [currency, setCurrency] = useState(user?.currency || "USD");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      await updateCurrency(currency);
      setMessage("Currency updated successfully");
    } catch (apiError) {
      setMessage("");
      setError(apiError.response?.data?.message || "Unable to update currency");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="narrow-page page-stack">
      <div className="page-heading">
        <p className="eyebrow">Account</p>
        <h1>Profile settings</h1>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <form className="form-panel" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={user?.name || ""} disabled />
        </label>

        <label>
          Email
          <input value={user?.email || ""} disabled />
        </label>

        <label>
          Currency
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {currencies.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} - {option.name}
              </option>
            ))}
          </select>
        </label>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save currency"}
        </button>
      </form>
    </section>
  );
};

export default Account;
