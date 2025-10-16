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
const ChipsAndExpo = ({ expo = 0, skipFetch = false, mockBalance = "0.00", mockIsAdmin = false }) => {
  const [balance, setBalance] = useState("0.00");
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async () => {
    try {
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
    }
  };

  useEffect(() => {
    if (skipFetch) {
      if (mockIsAdmin) {
        setIsAdmin(true);
        setBalance("∞");
      } else {
        setIsAdmin(false);
        setBalance(mockBalance);
      }
      return;
    }

    fetchProfile();
    const t = setInterval(fetchProfile, 5000);
    return () => clearInterval(t);
  }, [skipFetch, mockBalance, mockIsAdmin]);

  // ... same render as before
};


export default ChipsAndExpo;
