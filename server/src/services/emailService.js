import nodemailer from "nodemailer";
import { VERIFICATION_TTL_HOURS } from "../utils/verificationToken.js";

const APP_NAME = "Expense Tracker";

const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT) === 465, // true for port 465, false for 587/others (STARTTLS)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return transporter;
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const buildVerificationEmail = (name, verifyUrl) => {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verifyUrl);

  const text = `Hi ${name},

Thanks for signing up for ${APP_NAME}. Please verify your email address to activate your account:

${verifyUrl}

This link expires in ${VERIFICATION_TTL_HOURS} hours. If you didn't create this account, you can safely ignore this email.`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h1 style="font-size: 20px; margin-bottom: 4px;">${APP_NAME}</h1>
      <p>Hi ${safeName},</p>
      <p>Thanks for signing up. Please confirm this is your email address to activate your account.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${safeUrl}" style="background: #142227; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; font-weight: 600;">
          Verify email address
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">Or paste this link into your browser:<br>${safeUrl}</p>
      <p style="font-size: 13px; color: #6b7280;">This link expires in ${VERIFICATION_TTL_HOURS} hours and can only be used once.</p>
      <p style="font-size: 13px; color: #6b7280;">If you didn't create this account, you can safely ignore this email — no account will be activated without clicking the link above.</p>
    </div>
  `;

  return { text, html };
};

export const sendVerificationEmail = async ({ to, name, rawToken }) => {
  if (!isEmailConfigured()) {
    // Don't crash registration if email isn't configured (e.g. local dev) —
    // but make it loud in the server logs, since a silently-unsent
    // verification email means the user can never actually verify.
    console.warn(
      `EMAIL NOT SENT (email service not configured): verification link for ${to} — ` +
        `set EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD to enable real sending. ` +
        `For local testing, here is the raw token: ${rawToken}`
    );
    return { sent: false };
  }

  const clientUrl = (process.env.CLIENT_URL || "").split(",")[0]?.trim() || "http://localhost:5173";
  const verifyUrl = `${clientUrl.replace(/\/$/, "")}/verify-email?token=${rawToken}`;
  const { text, html } = buildVerificationEmail(name, verifyUrl);

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Verify your email for ${APP_NAME}`,
    text,
    html
  });

  return { sent: true };
};
