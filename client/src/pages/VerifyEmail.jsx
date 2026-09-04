import React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const VerifyEmail = () => {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        // Give the person a moment to read the confirmation before moving on.
        setTimeout(() => navigate("/dashboard"), 1500);
      })
      .catch((apiError) => {
        setStatus("error");
        setMessage(
          apiError.response?.data?.message ||
            "This verification link is invalid or has expired. Please request a new one from the login page."
        );
      });
    // Only run once on mount — verifying is a one-shot action tied to the token in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="auth-layout">
      <div className="auth-copy">
        <p className="eyebrow">Email verification</p>
        <h1>Confirming your account.</h1>
      </div>
      <div className="auth-card">
        {status === "verifying" && <p>Verifying your email…</p>}
        {status === "success" && <p>Your email is verified. Taking you to your dashboard…</p>}
        {status === "error" && (
          <>
            <div className="alert error">{message}</div>
            <p className="form-footer">
              <Link to="/login">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default VerifyEmail;
