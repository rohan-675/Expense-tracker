import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import path from "path";
import connectDB from "./src/config/db.js";
import { validateEnv } from "./src/config/env.js";
import { errorHandler, notFound } from "./src/middleware/errorMiddleware.js";
import { createRateLimiter } from "./src/middleware/rateLimitMiddleware.js";
import { isUsingEphemeralLocalStorage } from "./src/services/storageService.js";
import { migrateExistingUsersAsVerified } from "./src/startup/migrateEmailVerification.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import assistantRoutes from "./src/routes/assistantRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import budgetRoutes from "./src/routes/budgetRoutes.js";
import goalRoutes from "./src/routes/goalRoutes.js";
import recurringRoutes from "./src/routes/recurringRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";
import walletRoutes from "./src/routes/walletRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

// Most hosts (Render, Railway, Heroku, Vercel, or anything behind Nginx)
// put the app behind a reverse proxy. Without this, req.ip resolves to
// the proxy's address for every request, which breaks per-user rate
// limiting (everyone shares one bucket) and skews any IP-based logging.
// If your host chains more than one proxy in front of the app, increase
// the hop count accordingly.
app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(helmet());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

const allowedOrigins = new Set();
// CLIENT_URL may be a single origin or a comma-separated list — useful when
// the frontend is reachable at more than one exact origin (e.g. a custom
// domain plus its "www." variant, or a platform-provided domain kept as a
// fallback). CORS matches the origin header exactly, so every real origin
// the frontend can be loaded from must be listed here, or requests from an
// unlisted one will fail with no visible error to the end user beyond a
// generic network failure — this is a common cause of "it works for me but
// not for other people" bug reports.
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .forEach((origin) => allowedOrigins.add(origin));
}

if (!isProduction) {
  [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175"
  ].forEach((origin) => allowedOrigins.add(origin));
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({ message: "Expense Tracker API is running" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// General-purpose limit across all API routes, on top of the tighter
// route-specific limiters (auth, assistant). Generous enough not to
// interfere with normal use, but stops a runaway client or leaked token
// from hammering the backend indefinitely.
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many requests. Please slow down and try again shortly.",
  keyPrefix: "api"
});
app.use("/api", apiRateLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/assistant", assistantRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  validateEnv();
  await connectDB();
  await migrateExistingUsersAsVerified();

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn(
      "WARNING: EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD are not fully configured. " +
        "New registrations will be created but verification emails will NOT be sent " +
        "(the raw token will be logged to the server console instead, for local testing only)."
    );
  }

  if (isUsingEphemeralLocalStorage()) {
    console.warn(
      "WARNING: receipt uploads are stored on local disk (STORAGE_DRIVER is unset/'local') " +
        "while NODE_ENV=production. Many hosting platforms wipe local disk on every " +
        "redeploy/restart. If your host doesn't guarantee a persistent volume, set " +
        "STORAGE_DRIVER=s3 and the S3_* env vars — see server/.env.example."
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
