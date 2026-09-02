import React from "react";
import { Edit2, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api, { getApiRoot } from "../api/axios.js";
import CategoryIcon from "../components/CategoryIcon.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const defaultFilters = {
  type: "",
  category: "",
  startDate: "",
  endDate: ""
};
const apiRoot = getApiRoot();

// Receipts stored locally come back as a relative path (e.g.
// "/uploads/receipts/xyz.jpg") and need the API's origin prefixed. Receipts
// stored in S3 (or any other object storage) already come back as a full
// absolute URL and should be used as-is.
const resolveReceiptUrl = (url) => (/^https?:\/\//i.test(url) ? url : `${apiRoot}${url}`);

const TransactionHistory = () => {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get(`/transactions${queryString ? `?${queryString}` : ""}`);
      setTransactions(data);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [queryString]);

  useEffect(() => {
    api.get("/wallets").then(({ data }) => setWallets(data)).catch(() => setWallets([]));
  }, []);

  const handleFilterChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions((current) => current.filter((transaction) => transaction._id !== id));
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to delete transaction");
    }
  };

  const handleUpdate = async (payload) => {
    try {
      const { data } = await api.put(`/transactions/${editing._id}`, payload);
      setTransactions((current) =>
        current.map((transaction) => (transaction._id === data._id ? data : transaction))
      );
      setEditing(null);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to update transaction");
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Transaction history</p>
        <h1>Search, edit, and review every entry</h1>
      </div>

      {error && <div className="alert error">{error}</div>}

      <section className="filter-panel">
        <select name="type" value={filters.type} onChange={handleFilterChange}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input
          name="category"
          placeholder="Filter category"
          value={filters.category}
          onChange={handleFilterChange}
        />
        <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} />
        <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} />
        <button className="secondary-button" type="button" onClick={() => setFilters(defaultFilters)}>
          Clear
        </button>
      </section>

      {editing && (
        <section className="edit-panel">
          <div className="section-title">
            <h2>Edit transaction</h2>
            <button className="icon-button" type="button" onClick={() => setEditing(null)} aria-label="Close edit form">
              <X size={18} />
            </button>
          </div>
          <TransactionForm
            currency={currency}
            wallets={wallets}
            initialValues={editing}
            onSubmit={handleUpdate}
            submitLabel={
              <>
                <Save size={18} /> Update transaction
              </>
            }
          />
        </section>
      )}

      <section className="table-panel">
        {loading ? (
          <div className="status-panel">Loading transactions...</div>
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>
                      <span className={`badge ${transaction.type}`}>{transaction.type}</span>
                    </td>
                    <td>
                      <span className="category-cell">
                        <CategoryIcon category={transaction.category} type={transaction.type} />
                        {transaction.category}
                      </span>
                    </td>
                    <td className={`amount ${transaction.type}`}>{formatCurrency(transaction.amount, currency)}</td>
                    <td>{formatDate(transaction.date)}</td>
                    <td>
                      {transaction.description || "-"}
                      {transaction.walletId?.name && <span className="table-note">Wallet: {transaction.walletId.name}</span>}
                      {transaction.receipt?.url && (
                        <a
                          className="table-note link-note"
                          href={resolveReceiptUrl(transaction.receipt.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View receipt
                        </a>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => setEditing(transaction)} aria-label="Edit transaction">
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => handleDelete(transaction._id)} aria-label="Delete transaction">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && <p className="empty-state">No transactions match your filters.</p>}
          </div>
        )}
      </section>
    </section>
  );
};

export default TransactionHistory;
