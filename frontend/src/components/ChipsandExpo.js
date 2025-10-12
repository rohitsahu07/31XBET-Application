import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import api from "../services/api";

/**
 * 🔹 Compact Global Chips & Expo Bar
 * ---------------------------------
 * Displays in a single slim row:
 * 💰 Chips: ₹balance    |    📈 Expo: ₹amount
 */
const ChipsAndExpo = ({ expo = 0 }) => {
  const [balance, setBalance] = useState(0);

  // Fetch live balance
  const fetchBalance = async () => {
    try {
      const res = await api.get("/api/profile/");
      setBalance(res.data.balance);
    } catch (err) {
      console.error("Balance fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1200,
        width: "100%",
        backgroundColor: "#1c1c1c",
        color: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 2,
        py: 0.5, // slim height
        fontSize: "0.9rem",
        borderBottom: "1px solid #333",
        boxShadow: "0px 1px 4px rgba(0,0,0,0.3)",
      }}
    >
      <Typography sx={{ fontWeight: 500 }}>
        💰 <span style={{ color: "#0ABAB5", fontWeight: 600 }}>Chips:</span> ₹
        {parseFloat(balance).toFixed(2)}
      </Typography>

      <Typography sx={{ fontWeight: 500 }}>
        📈 <span style={{ color: "#ffc107", fontWeight: 600 }}>Expo:</span> ₹
        {expo.toFixed(2)}
      </Typography>
    </Box>
  );
};

export default ChipsAndExpo;
