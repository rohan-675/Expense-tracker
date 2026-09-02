import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const currentMonth = new Date().toISOString().slice(0, 7);

const Reports = () => {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [month, setMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const [year, monthIndex] = month.split("-");
    const startDate = `${month}-01`;
    const endDate = new Date(Number(year), Number(monthIndex), 0).toISOString().slice(0, 10);
    api.get(`/transactions?startDate=${startDate}&endDate=${endDate}`).then(({ data }) => setTransactions(data));
  }, [month]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (totals, transaction) => {
        if (transaction.type === "income") totals.income += transaction.amount;
        if (transaction.type === "expense") {
          totals.expense += transaction.amount;
          totals.categories[transaction.category] = (totals.categories[transaction.category] || 0) + transaction.amount;
        }
        totals.balance = totals.income - totals.expense;
        return totals;
      },
      { income: 0, expense: 0, balance: 0, categories: {} }
    );
  }, [transactions]);

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`ExpenseFlow Monthly Report - ${month}`, 14, 18);
    doc.setFontSize(11);
    doc.text(`Income: ${formatCurrency(summary.income, currency)}`, 14, 30);
    doc.text(`Expenses: ${formatCurrency(summary.expense, currency)}`, 14, 38);
    doc.text(`Balance: ${formatCurrency(summary.balance, currency)}`, 14, 46);

    autoTable(doc, {
      startY: 56,
      head: [["Category", "Total"]],
      body: Object.entries(summary.categories).map(([category, amount]) => [category, formatCurrency(amount, currency)])
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["Date", "Type", "Category", "Amount", "Description"]],
      body: transactions.map((transaction) => [
        formatDate(transaction.date),
        transaction.type,
        transaction.category,
        formatCurrency(transaction.amount, currency),
        transaction.description || ""
      ])
    });

    doc.save(`expense-report-${month}.pdf`);
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">PDF export</p>
        <h1>Download a clean monthly money report</h1>
      </div>

      <section className="filter-panel">
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <button className="primary-button" type="button" onClick={downloadPdf}>
          <Download size={18} /> Download PDF
        </button>
      </section>

      <div className="stats-grid">
        <article className="stat-card income"><p>Income</p><strong>{formatCurrency(summary.income, currency)}</strong></article>
        <article className="stat-card expense"><p>Expense</p><strong>{formatCurrency(summary.expense, currency)}</strong></article>
        <article className="stat-card balance"><p>Balance</p><strong>{formatCurrency(summary.balance, currency)}</strong></article>
      </div>
    </section>
  );
};

export default Reports;

