// src/components/ChipsAndExpo.js
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import api from "../services/api";

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
 * - Reads from /api/bets/profile/
 * - Admins display ∞
 */
const ChipsAndExpo = ({ expo = 0 }) => {
  const [balance, setBalance] = useState("0.00");
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async () => {
    try {
      // IMPORTANT: this hits the bets app route
      const { data } = await api.get("/api/bets/profile/");
      if (data?.is_admin) {
        setIsAdmin(true);
        setBalance("∞");
      } else {
        setIsAdmin(false);
        setBalance(data?.balance ?? data?.chips ?? "0.00");
      }
    } catch (err) {
      console.error("Balance fetch failed:", err);
      // don't crash UI; keep last good value
    }
  };

  useEffect(() => {
    fetchProfile();
    const t = setInterval(fetchProfile, 5000);
    return () => clearInterval(t);
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
          ₹{isAdmin ? "∞" : formatINR(expo)}
        </span>
      </Typography>
    </Box>
  );
};

export default ChipsAndExpo;
