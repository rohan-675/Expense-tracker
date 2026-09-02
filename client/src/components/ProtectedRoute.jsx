import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // While we're still checking the httpOnly session cookie against the
  // backend, render nothing rather than redirecting — otherwise a
  // logged-in user gets bounced to /login for a flash on every refresh.
  if (isLoading) {
    return <div className="app-shell__loading">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
