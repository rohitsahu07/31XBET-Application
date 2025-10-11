// frontend/src/components/CountdownTimer.js
import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";

const CountdownTimer = () => {
  const [time, setTime] = useState(20);
  const [phase, setPhase] = useState("long"); // "long" = 20→0, "short" = 10→0

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev > 0) return prev - 1;
        else {
          // Switch phase when timer hits 0
          if (phase === "long") {
            setPhase("short");
            return 10;
          } else {
            setPhase("long");
            return 20;
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  return (
    <Box
      sx={{
        bgcolor: "#1e88e5",
        borderRadius: "50%",
        width: 70,
        height: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        fontSize: "1.5rem",
        boxShadow: "0 0 10px rgba(255,255,255,0.4)",
      }}
    >
      <Typography variant="h5">{time}</Typography>
    </Box>
  );
};

export default CountdownTimer;
