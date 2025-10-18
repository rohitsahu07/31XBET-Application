// src/layouts/MinimalHeaderLayout.jsx
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Header from "../components/Header";

export default function MinimalHeaderLayout() {
  return (
    <>
      <Header />
      <Box sx={{ p: 0 }}>
        <Outlet />
      </Box>
    </>
  );
}
