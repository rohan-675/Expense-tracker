import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

// Everything past initial login/dashboard is lazy-loaded so the first page
// load doesn't have to ship jsPDF, Recharts, and every other page's code
// up front. This is what keeps the main bundle small (see
// vite.build.config.mjs for the accompanying manualChunks split).
const AddTransaction = lazy(() => import("./pages/AddTransaction.jsx"));
const Account = lazy(() => import("./pages/Account.jsx"));
const Assistant = lazy(() => import("./pages/Assistant.jsx"));
const Budgets = lazy(() => import("./pages/Budgets.jsx"));
const Goals = lazy(() => import("./pages/Goals.jsx"));
const Recurring = lazy(() => import("./pages/Recurring.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const SmartAnalytics = lazy(() => import("./pages/SmartAnalytics.jsx"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory.jsx"));
const Wallets = lazy(() => import("./pages/Wallets.jsx"));

const RouteFallback = () => <div className="app-shell__loading">Loading…</div>;

const App = () => {
  return (
    <>
      <Navbar />
      <main className="app-shell">
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <AddTransaction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <TransactionHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <Budgets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallets"
            element={
              <ProtectedRoute>
                <Wallets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <Goals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring"
            element={
              <ProtectedRoute>
                <Recurring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <SmartAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <Assistant />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </main>
    </>
  );
};

export default App;
