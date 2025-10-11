// src/components/BackToMainMenuButton.js
import React from "react";
import { Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const BackToMainMenuButton = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        textAlign: "center",
        mt: 3,
      }}
    >
      <Button
        variant="contained"
        className="main-menu-btn"
        sx={{
          color: "white",
          fontWeight: "bold",
          px: 4,
          py: 1,
          borderRadius: "4px",
        }}
        onClick={() => navigate("/home")}
      >
        BACK TO MAIN MENU
      </Button>
    </Box>
  );
};

export default BackToMainMenuButton;
