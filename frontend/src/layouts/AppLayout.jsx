// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Header from "../components/Header";
import ChipsAndExpo from "../components/ChipsandExpo";
import ScrollingTextBar from "../components/common_components/ScrollingBar";
import React, { createContext, useContext, useState } from "react";

const ExpoContext = createContext({ expo: 0, setExpo: () => {} });
export const useExpo = () => useContext(ExpoContext);

export default function AppLayout() {
  const [expo, setExpo] = useState(0);
  return (
    <ExpoContext.Provider value={{ expo, setExpo }}>
      <Header />
      <ChipsAndExpo skipFetch mockBalance={7500} mockIsAdmin={false} />
      <ScrollingTextBar />
      <Box sx={{ p: 0 }}>
        <Outlet />
      </Box>
    </ExpoContext.Provider>
  );
}
