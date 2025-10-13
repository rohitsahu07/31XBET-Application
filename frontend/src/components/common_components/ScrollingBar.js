// src/components/ScrollingTextBar.js
import React from "react";
import { Box, Typography, keyframes } from "@mui/material";

const scroll = keyframes`
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
`;

const ScrollingTextBar = ({
  text = "ground commentary ki bet delete hongi har match m.. Kalyan, Gali, Disawer Matka chalu h",
  bgColor = "#FFD600",
  textColor = "#000",
  duration = "25s",
}) => (
  <Box
    sx={{
      width: "100%",
      overflow: "hidden",
      whiteSpace: "nowrap",
      bgcolor: bgColor,
      mt: 1,
      py: 0.5,
      borderRadius: "3px",
      boxShadow: "inset 0 -1px 3px rgba(0,0,0,0.1)",
    }}
  >
    <Typography
      component="div"
      sx={{
        display: "inline-block",
        px: 2,
        animation: `${scroll} ${duration} linear infinite`,
        fontWeight: 500,
        fontSize: { xs: "12px", sm: "15px" },
        color: textColor,
        "&:hover": { animationPlayState: "paused" },
      }}
    >
      {text}
    </Typography>
  </Box>
);

export default ScrollingTextBar;
