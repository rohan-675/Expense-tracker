const required = ["MONGO_URI", "JWT_SECRET"];

export const validateEnv = () => {
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL?.trim()) {
    throw new Error("CLIENT_URL is required in production");
  }

  if (process.env.JWT_SECRET.trim().length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
};
