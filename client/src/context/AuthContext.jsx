import React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Auth now lives in an httpOnly cookie the browser controls, so on first
  // load we don't know yet whether the visitor has a valid session — we
  // have to ask the backend. isLoading covers that brief window so
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
    setUser(data);
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setUser(data);
  };

  const loginWithGoogle = async (credential, currency) => {
    const { data } = await api.post("/auth/google", { credential, currency });
    setUser(data);
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
      updateCurrency
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
