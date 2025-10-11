// src/components/SectionHeader.js
import React from "react";
import { Box } from "@mui/material";

const SectionHeader = ({
  title = "Section Title",
  bgColor = "#c62828",
  textColor = "#fff",
  mx = 0,
  mb = 0,
  mt = 0
}) => {
  return (
    <Box
      sx={{
        bgcolor: bgColor,
        color: textColor,
        textAlign: "center",
        fontWeight: "bold",
        p: 1.5,
        borderRadius: "5px",
        fontSize: "1.1rem",
        mb: mb,
        mx: mx,
        mt: mt,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        boxShadow: "0px 2px 6px rgba(0,0,0,0.15)",
      }}
    >
      {title}
    </Box>
  );
};

export default SectionHeader;
