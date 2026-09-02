import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
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

    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      await login(form);
      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      setLoading(true);
      await loginWithGoogle(response.credential);
      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to login with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-layout">
      <div className="auth-copy">
        <p className="eyebrow">Personal finance made clear</p>
        <h1>Track spending, income, and balance in one focused workspace.</h1>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <div className="alert error">{error}</div>}

        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} />
        </label>

        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={handleChange} />
        </label>

        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Logging in..." : "Login"}
        </button>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <div className="google-login-wrap">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google login failed")} />
          </div>
        )}

        <p className="form-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </section>
  );
};

export default Login;
