import crypto from "crypto";

const VERIFICATION_TOKEN_TTL_HOURS = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24);

// The raw token is what goes in the emailed link; only its hash is ever
// persisted (mirrors how the password itself is never stored in plaintext).
// This means a database leak alone can't be replayed as a valid
// verification link, and the token is single-use because it's cleared
// from the user document the moment it's successfully verified.
export const hashToken = (rawToken) => crypto.createHash("sha256").update(rawToken).digest("hex");

export const generateVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000)
  };
};

export const VERIFICATION_TTL_HOURS = VERIFICATION_TOKEN_TTL_HOURS;
