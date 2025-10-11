// src/App.js
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Provider } from "react-redux";
import { Box } from "@mui/material";
import store from "./redux/store";

// Pages
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import LedgerPage from "./pages/LedgerPage";
import HierarchyPage from "./pages/HierarchyPage";
import CreateUserPage from "./pages/CreateUserPage";
import BetFormPage from "./pages/BetFormPage";
import RulesPage from "./pages/RulesPage";
import InplayPage from "./pages/InplayPage";
import CasinoPage from "./pages/CasinoPage";
import TeenPlayPage from "./pages/TeenPlayPage";
import UserManagementPage from "./pages/UserManagementPage";
import StatementPage from "./pages/StatementPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

// Components
import Header from "./components/Header";
import SideBar from "./components/SideBar";

// ===============================
// MAIN APP CONTENT
// ===============================
const AppContent = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = () => setSidebarOpen(!sidebarOpen);

  // Hide header & sidebar on login page only
  const showHeader = location.pathname !== "/";

  return (
    <>
      {showHeader && <Header onMenuToggle={handleMenuToggle} />}
      {showHeader && <SideBar open={sidebarOpen} onClose={handleMenuToggle} />}

      <Box sx={{ mt: showHeader ? 0 : 0, p: 0 }}>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<LoginPage />} />

          {/* Private routes */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/statement" element={<StatementPage />} />
          <Route path="/hierarchy" element={<HierarchyPage />} />
          <Route path="/create-user" element={<CreateUserPage />} />
          <Route path="/bet-form" element={<BetFormPage />} />
          <Route path="/inplay/matches" element={<InplayPage />} />
          <Route path="/casino" element={<CasinoPage />} />
          <Route path="/teen-play" element={<TeenPlayPage />} />
          <Route path="/user-management" element={<UserManagementPage />} />
          <Route path="/password" element={<ChangePasswordPage />} />
        </Routes>
      </Box>
    </>
  );
};

// ===============================
// MUI THEME CONFIG
// ===============================
const theme = createTheme({
  palette: {
    primary: { main: "#00A86B" }, // a nice green theme
    secondary: { main: "#C62828" },
    background: { default: "#F9FAFB", paper: "#FFFFFF" },
    text: { primary: "#0A0A0A", secondary: "#555555" },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
    h1: { fontSize: "2rem", fontWeight: 600 },
    h2: { fontSize: "1.5rem", fontWeight: 500 },
    body1: { fontSize: "1rem" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: "8px", textTransform: "none", fontWeight: 600 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: "0 4px 10px rgba(0,0,0,0.1)", borderRadius: "12px" },
      },
    },
  },
});

// ===============================
// APP WRAPPER
// ===============================
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={store}>
        <Router>
          <AppContent />
        </Router>
      </Provider>
    </ThemeProvider>
  );
}

export default App;
