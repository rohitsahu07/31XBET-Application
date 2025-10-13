// frontend/src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 30000,          // generous for dev; don't add short per-request timeouts
  withCredentials: false,  // JWT in header; no cookies/CSRF
});

// Attach JWT and sensible defaults to every request
api.interceptors.request.use(
  (config) => {
    // accept both key names to be safe
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
    if (!config.headers.Accept) {
      config.headers.Accept = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
