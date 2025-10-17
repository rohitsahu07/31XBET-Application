// src/components/ChipsAndExpo.js
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import api from "../services/api"; // kept for optional fallback fetch

/**
 * Toggle this to re-enable the API later.
 * You can also override via env:
 * REACT_APP_DISABLE_PROFILE=1 (disabled) or 0 (enabled)
 * REACT_APP_MOCK_IS_ADMIN=true/false
 * REACT_APP_MOCK_BALANCE=5000
 */
const DISABLE_PROFILE =
  String(process.env.REACT_APP_DISABLE_PROFILE ?? "0") === "1"; // default: enabled

const MOCK_IS_ADMIN =
  String(process.env.REACT_APP_MOCK_IS_ADMIN ?? "false").toLowerCase() ===
  "true";

const MOCK_BALANCE = process.env.REACT_APP_MOCK_BALANCE ?? "0.00";

// Ensure WS goes to backend, not the React dev server
// Override with REACT_APP_WS_ORIGIN="wss://your-domain.com" (no trailing slash)
const WS_ORIGIN = process.env.REACT_APP_WS_ORIGIN || "ws://localhost:8000";

// ---------- JWT helpers (refresh + decode) ----------
function decodeJwtExp(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp : 0; // seconds
  } catch {
    return 0;
  }
}

async function refreshAccessIfNeeded() {
  // read tokens from either sessionStorage or localStorage
  let access =
    sessionStorage.getItem("access") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token");

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = access ? decodeJwtExp(access) : 0;

  // if no access or expires within 30s, try refreshing
  if (!access || exp - nowSec < 30) {
    const refresh =
      sessionStorage.getItem("refresh") || localStorage.getItem("refresh");
    if (!refresh) return null;

    const res = await fetch("/api/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    access = data.access;
    if (access) {
      // store back (mirror your app’s convention)
      sessionStorage.setItem("access", access);
      sessionStorage.setItem("access_token", access);
      // optional: keep refresh fresh if backend rotates it
      if (data.refresh) sessionStorage.setItem("refresh", data.refresh);
    }
  }
  return access || null;
}

// INR formatter
const formatINR = (val) => {
  if (val === null || val === undefined) return "0.00";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Slim Chips & Expo bar (no emojis)
 * - If DISABLE_PROFILE is true, it uses mock values and NEVER calls /api/bets/profile/
 * - If DISABLE_PROFILE is false, it opens a WebSocket to /ws/profile/?token=...
 * - Admins display ∞
 */
const ChipsAndExpo = ({ expo = 0 }) => {
  const [balance, setBalance] = useState("0.00");
  const [isAdmin, setIsAdmin] = useState(false);
  // If you want expo from WS instead of prop, uncomment next line and use setExpoState in onmessage
  // const [expoState, setExpoState] = useState("0.00");

  const applyMock = () => {
    if (MOCK_IS_ADMIN) {
      setIsAdmin(true);
      setBalance("∞");
    } else {
      setIsAdmin(false);
      setBalance(MOCK_BALANCE);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/api/bets/profile/");
      if (data?.is_admin) {
        setIsAdmin(true);
        setBalance("∞");
      } else {
        setIsAdmin(false);
        setBalance(data?.balance ?? data?.chips ?? "0.00");
        // if (data?.expo !== undefined) setExpoState(data.expo);
      }
    } catch (err) {
      console.error("Balance fetch failed:", err);
      // keep last known value
    }
  };

  useEffect(() => {
    let ws;
    let closed = false;

    async function connect() {
      if (DISABLE_PROFILE) {
        applyMock();
        return;
      }

      const access = await refreshAccessIfNeeded();
      if (!access) {
        // fallback once to REST if you want
        await fetchProfile();
        return;
      }

      const url = `${WS_ORIGIN}/ws/profile/?token=${access}`;
      ws = new WebSocket(url);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "profile_update") {
            if (typeof msg.is_admin === "boolean") setIsAdmin(msg.is_admin);
            else setIsAdmin(false);

            if (msg.balance !== undefined) setBalance(msg.balance);
            // If you want expo from WS instead of prop:
            // if (msg.expo !== undefined) setExpoState(msg.expo);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        // optional: one-shot REST fallback
        fetchProfile();
      };

      ws.onclose = async () => {
        if (closed) return;
        // likely auth/expiry/disconnect; try refresh + retry after a bit
        await new Promise((r) => setTimeout(r, 1000));
        connect();
      };
    }

    connect();

    return () => {
      closed = true;
      try {
        ws && ws.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1200,
        width: "100%",
        backgroundColor: "#121212",
        color: "#EDEDED",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 2,
        py: 0.75,
        borderBottom: "1px solid #1f1f1f",
      }}
    >
      {/* Chips (Balance) */}
      <Typography
        sx={{
          fontWeight: 600,
          letterSpacing: 0.2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <span style={{ color: "#9da3af" }}>Chips</span>
        <span
          style={{
            background: "#1b2735",
            color: "#d1fae5",
            padding: "2px 10px",
            borderRadius: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ₹{isAdmin ? "∞" : formatINR(balance)}
        </span>
      </Typography>

      {/* Exposure */}
      <Typography
        sx={{
          fontWeight: 600,
          letterSpacing: 0.2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <span style={{ color: "#9da3af" }}>Expo</span>
        <span
          style={{
            background: "#1b2735",
            color: "#fef3c7",
            padding: "2px 10px",
            borderRadius: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ₹{isAdmin ? "∞" : formatINR(expo /* or expoState if you wire it */)}
        </span>
      </Typography>
    </Box>
  );
};

export default ChipsAndExpo;
