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

/* attach Authorization automatically + normalize urls */
api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 🔧 normalize path to avoid "/api/api/..." 404s
  // - leave absolute URLs alone
  let url = config.url || "";
  const isAbsolute = /^https?:\/\//i.test(url) || /^wss?:\/\//i.test(url);
  if (!isAbsolute) {
    if (!url.startsWith("/")) url = `/${url}`;
    // if caller mistakenly uses "/api/..." strip the leading "/api"
    if (url.startsWith("/api/")) url = url.replace(/^\/api\//, "/");
    // collapse accidental double slashes
    url = url.replace(/\/{2,}/g, "/");
    config.url = url;
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
