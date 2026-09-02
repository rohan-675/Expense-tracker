import React from "react";
import { useEffect, useState } from "react";

const defaultForm = {
  type: "expense",
  category: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  description: ""
};

const validateForm = (form) => {
  const errors = {};

  if (!form.category.trim()) errors.category = "Category is required";
  if (!form.amount || Number(form.amount) <= 0) errors.amount = "Enter an amount greater than zero";
  if (!form.date) errors.date = "Date is required";

  return errors;
};

const TransactionForm = ({
  currency = "USD",
  initialValues,
  onSubmit,
  submitLabel = "Save transaction",
  wallets = [],
  showReceipt = false
}) => {
  const [form, setForm] = useState(defaultForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        type: initialValues.type || "expense",
        category: initialValues.category || "",
        amount: initialValues.amount || "",
        date: initialValues.date ? initialValues.date.slice(0, 10) : defaultForm.date,
        description: initialValues.description || "",
        walletId: initialValues.walletId?._id || initialValues.walletId || ""
      });
    }
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleFileChange = (event) => {
    setReceiptFile(event.target.files?.[0] || null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      ...form,
      amount: Number(form.amount),
      receiptFile
    });

    if (!initialValues) {
      setForm(defaultForm);
      setReceiptFile(null);
    }
  };

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="segmented-control" role="group" aria-label="Transaction type">
        <label className={form.type === "income" ? "active" : ""}>
          <input
            type="radio"
            name="type"
            value="income"
            checked={form.type === "income"}
            onChange={handleChange}
          />
          Income
        </label>
        <label className={form.type === "expense" ? "active" : ""}>
          <input
            type="radio"
            name="type"
            value="expense"
            checked={form.type === "expense"}
            onChange={handleChange}
          />
          Expense
        </label>
      </div>

      <label>
        Category
        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Salary, groceries, rent"
        />
        {errors.category && <span className="field-error">{errors.category}</span>}
      </label>

      <label>
        Amount ({currency})
        <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={handleChange} />
        {errors.amount && <span className="field-error">{errors.amount}</span>}
      </label>

      {wallets.length > 0 && (
        <label>
          Wallet
          <select name="walletId" value={form.walletId || wallets[0]?._id || ""} onChange={handleChange}>
            {wallets.map((wallet) => (
              <option key={wallet._id} value={wallet._id}>
                {wallet.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Date
        <input name="date" type="date" value={form.date} onChange={handleChange} />
        {errors.date && <span className="field-error">{errors.date}</span>}
      </label>

      <label>
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Optional note"
          rows="4"
        />
      </label>

      {showReceipt && (
        <label>
          Receipt image or PDF
          <input accept="image/*,.pdf" type="file" onChange={handleFileChange} />
        </label>
      )}

      <button className="primary-button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
};

export default TransactionForm;
