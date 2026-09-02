import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl) {
  throw new Error("VITE_API_URL is required. Set it in your client environment configuration.");
}

const api = axios.create({
  baseURL: configuredApiUrl,
  // Auth now lives in an httpOnly cookie set by the backend rather than a
  // token read out of localStorage, so the browser needs to send/accept
  // cookies on cross-origin requests to the API.
  withCredentials: true
});

export const getApiRoot = () => configuredApiUrl.replace(/\/api\/?$/, "");

export default api;
