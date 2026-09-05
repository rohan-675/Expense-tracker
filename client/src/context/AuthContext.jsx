import React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAuthToken } from "../api/axios.js";

const AuthContext = createContext(null);

// Splits a session response into the plain user profile (React state) and
// the token (handed straight to the in-memory axios fallback, never kept
// in React state/localStorage/sessionStorage).
const applySession = (data, setUser) => {
  const { token, ...userData } = data;
  setAuthToken(token);
  setUser(userData);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Auth lives primarily in an httpOnly cookie the browser controls, so on
  // first load we don't know yet whether the visitor has a valid session —
  // we have to ask the backend. isLoading covers that brief window so
  // ProtectedRoute doesn't bounce a logged-in user to /login before we
  // know for sure.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    applySession(data, setUser);
  };

  const register = async (payload) => {
    // Registration no longer logs the user in directly — the account is
    // created unverified and a verification email is sent. The backend
    // response here is just a confirmation message, not a user session.
    const { data } = await api.post("/auth/register", payload);
    return data;
  };

  const verifyEmail = async (token) => {
    const { data } = await api.post("/auth/verify-email", { token });
    applySession(data, setUser);
  };

  const resendVerification = async (email) => {
    const { data } = await api.post("/auth/resend-verification", { email });
    return data;
  };

  const loginWithGoogle = async (credential, currency) => {
    const { data } = await api.post("/auth/google", { credential, currency });
    applySession(data, setUser);
  };

  const updateCurrency = async (currency) => {
    const { data } = await api.patch("/auth/profile/currency", { currency });
    setUser(data);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      // Clear local state regardless of whether the network call succeeded
      // so the user is never stuck "logged in" on the client after asking
      // to log out.
      setAuthToken(null);
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      loginWithGoogle,
      logout,
      register,
      verifyEmail,
      resendVerification,
      updateCurrency
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
