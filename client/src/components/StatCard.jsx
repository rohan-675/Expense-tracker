import React from "react";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

const icons = {
  income: ArrowUpRight,
  expense: ArrowDownRight,
  balance: Wallet
};

const StatCard = ({ label, value, tone }) => {
  const Icon = icons[tone] || Wallet;

  return (
    <section className={`stat-card ${tone}`}>
      <div className="stat-card-top">
        <p>{label}</p>
        <span className="stat-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
      </div>
      <strong>{value}</strong>
    </section>
  );
};

export default StatCard;
