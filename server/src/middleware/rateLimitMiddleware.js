// NOTE: this is an in-memory limiter, scoped to a single Node process.
// It is fine for a single-instance deployment. If you ever scale the
// backend to multiple instances/containers, move this to a shared store
// (e.g. Redis) so limits are enforced across all instances instead of
// separately per instance.
const buckets = new Map();

// Periodically evict expired entries so `buckets` doesn't grow forever
// on a long-running server that sees many distinct IPs/users.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref();

export const createRateLimiter = ({ windowMs, max, message, keyPrefix = "" }) => {
  return (req, res, next) => {
    // Prefer the authenticated user id when available (set by `protect`,
    // which may run before or after this middleware depending on the
    // route) so limits apply per-account rather than per-IP where possible.
    const identity = req.user?._id?.toString() || req.ip || req.socket.remoteAddress || "unknown";
    const key = `${keyPrefix}:${identity}`;
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now > entry.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message });
    }

    return next();
  };
};
