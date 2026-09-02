import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { currencies } from "../utils/currencies.js";

const Register = () => {
  const { isAuthenticated, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", currency: "USD" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError("Enter your name, email, and a password with at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      await register(form);
      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      setLoading(true);
      await loginWithGoogle(response.credential, form.currency);
      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to continue with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-layout">
      <div className="auth-copy">
        <p className="eyebrow">Start with better money habits</p>
        <h1>Create your account and keep every transaction organized.</h1>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Register</h2>
        {error && <div className="alert error">{error}</div>}

        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} />
        </label>

        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} />
        </label>

        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={handleChange} minLength={8} />
        </label>

        <label>
          Preferred currency
          <select name="currency" value={form.currency} onChange={handleChange}>
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </label>

        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Creating account..." : "Create account"}
        </button>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <div className="google-login-wrap">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google login failed")} />
          </div>
        )}

        <p className="form-footer">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </section>
  );
};

export default Register;
