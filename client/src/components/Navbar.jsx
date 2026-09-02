import React from "react";
import { useState } from "react";
import {
  BarChart3,
  Bot,
  ChevronDown,
  Flag,
  Goal,
  LayoutGrid,
  LineChart,
  LogOut,
  Moon,
  PiggyBank,
  PlusCircle,
  ReceiptText,
  Repeat2,
  Sun,
  UserRound,
  WalletCards
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const mainLinks = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/add", label: "Add", icon: PlusCircle },
  { to: "/history", label: "History", icon: ReceiptText },
  { to: "/budgets", label: "Budgets", icon: PiggyBank }
];

const moneyLinks = [
  { to: "/wallets", label: "Wallets", icon: WalletCards },
  { to: "/goals", label: "Goals", icon: Goal },
  { to: "/analytics", label: "Analytics", icon: LineChart }
];

const toolLinks = [
  { to: "/recurring", label: "Recurring", icon: Repeat2 },
  { to: "/reports", label: "Reports", icon: Flag },
  { to: "/assistant", label: "AI", icon: Bot }
];

const NavGroup = ({ links, onNavigate }) => (
  <div className="nav-group">
    {links.map(({ to, label, icon: Icon }) => (
      <NavLink key={to} to={to} onClick={onNavigate}>
        <Icon size={17} />
        <span>{label}</span>
      </NavLink>
    ))}
  </div>
);

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <NavLink className="brand" to="/dashboard">
        <span className="brand-mark">
          <WalletCards size={24} />
        </span>
        <span className="brand-copy">
          <strong>ExpenseFlow</strong>
          <small>Money control center</small>
        </span>
      </NavLink>

      {isAuthenticated ? (
        <nav className="nav-links" aria-label="Main navigation">
          <NavGroup links={mainLinks} />
          <div className={`nav-more ${moreOpen ? "open" : ""}`}>
            <button
              className="nav-more-button"
              type="button"
              onClick={() => setMoreOpen((current) => !current)}
              aria-expanded={moreOpen}
            >
              <LayoutGrid size={17} />
              <span>More</span>
              <ChevronDown size={16} />
            </button>
            <div className="nav-more-panel">
              <div>
                <p>Plan</p>
                <NavGroup links={moneyLinks} onNavigate={() => setMoreOpen(false)} />
              </div>
              <div>
                <p>Tools</p>
                <NavGroup links={toolLinks} onNavigate={() => setMoreOpen(false)} />
              </div>
            </div>
          </div>
          <div className="nav-actions">
            <NavLink className="user-chip" to="/account">
              <UserRound size={17} />
              <span>{user?.name}</span>
            </NavLink>
            <button className="icon-button nav-action-button" type="button" onClick={toggleTheme} aria-label="Toggle dark mode">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button nav-action-button" type="button" onClick={handleLogout} aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </nav>
      ) : (
        <nav className="nav-links" aria-label="Authentication navigation">
          <div className="nav-group">
            <NavLink to="/login">Login</NavLink>
            <NavLink className="button-link" to="/register">
              Register
            </NavLink>
          </div>
          <div className="nav-actions">
            <button className="icon-button nav-action-button" type="button" onClick={toggleTheme} aria-label="Toggle dark mode">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
