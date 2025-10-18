// frontend/src/services/api.js
import axios from "axios";

/* token helpers */
export const getAccess = () =>
  sessionStorage.getItem("access") || localStorage.getItem("access") || null;
export const getRefresh = () =>
  sessionStorage.getItem("refresh") || localStorage.getItem("refresh") || null;

export const saveTokens = ({ access, refresh }) => {
  sessionStorage.setItem("access", access);
  if (refresh) sessionStorage.setItem("refresh", refresh);
};

export const clearTokens = () => {
  sessionStorage.removeItem("access");
  sessionStorage.removeItem("refresh");
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
};

const api = axios.create({ baseURL: "/api" });

/* attach Authorization automatically */
api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* auto-logout on stale session (other device logged in) */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const code =
      err?.response?.data?.code ||
      err?.response?.data?.detail ||
      err?.response?.data?.error;

    if (status === 401 && (code === "session_invalid" || /session/i.test(String(code)))) {
      try {
        clearTokens();
      } finally {
        alert("You were logged out because your account was used on another device.");
        window.location.assign("/login?reason=other_device");
      }
      return; // stop chain
    }
    return Promise.reject(err);
  }
);

export default api;
