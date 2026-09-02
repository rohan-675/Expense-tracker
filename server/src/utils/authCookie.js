export const COOKIE_NAME = "token";

const COOKIE_MAX_AGE_MS = Number(process.env.JWT_COOKIE_DAYS || 7) * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  // The frontend and backend are deployed on different origins (separate
  // static host + API host), so the cookie must be sent cross-site.
  // Browsers require SameSite=None to be paired with Secure. Modern
  // browsers treat http://localhost as a secure context, so this also
  // works during local development without HTTPS.
  secure: true,
  sameSite: "none",
  path: "/"
});

export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
};
