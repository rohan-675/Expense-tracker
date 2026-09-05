import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl) {
  throw new Error("VITE_API_URL is required. Set it in your client environment configuration.");
}

const api = axios.create({
  baseURL: configuredApiUrl,
  // Auth lives primarily in an httpOnly cookie set by the backend, so the
  // browser needs to send/accept cookies on cross-origin requests.
  withCredentials: true
});

// Fallback for browsers that reject the cross-site auth cookie outright
// (third-party-cookie blocking is now common even in regular Chrome, not
// just Safari/Incognito). Held ONLY in memory — never localStorage or
// sessionStorage — so it disappears on tab close/reload rather than
// persisting like a stolen-via-XSS token would. AuthContext sets this
// right after login/register-verify/Google sign-in; the backend already
// accepts this header as a fallback behind the cookie check.
let inMemoryAuthToken = null;
export const setAuthToken = (token) => {
  inMemoryAuthToken = token || null;
};

api.interceptors.request.use((config) => {
  if (inMemoryAuthToken) {
    config.headers.Authorization = `Bearer ${inMemoryAuthToken}`;
  }
  return config;
});

export const getApiRoot = () => configuredApiUrl.replace(/\/api\/?$/, "");

export default api;
