// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Provider } from "react-redux";
import { Box } from "@mui/material";
import store from "./redux/store";

// Components
import Header from "./components/Header";

// Pages
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import LedgerPage from "./pages/LedgerPage";
import RulesPage from "./pages/RulesPage";
import CasinoPage from "./pages/CasinoPage";
import TeenPlayPage from "./pages/TeenPlayPage";
import UserManagementPage from "./pages/UserManagementPage";
import StatementPage from "./pages/StatementPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ScrollingTextBar from "./components/common_components/ScrollingBar";
import ProfilePage from "./pages/ProfilePage";


const AppContent = () => {
  const location = useLocation();
  const showHeader = location.pathname !== "/"; // Hide header on login
  const showScrollingBar = location.pathname !== "/"; // Hide header on login

  return (
    <>
      {showHeader && <Header />}
      {showScrollingBar && <ScrollingTextBar />}

      <Box sx={{ p: 0 }}>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<LoginPage />} />

          {/* Authenticated routes */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/statement" element={<StatementPage />} />
          <Route path="/casino" element={<CasinoPage />} />
          <Route path="/teen-play" element={<TeenPlayPage />} />
          <Route path="/user-management" element={<UserManagementPage />} />
          <Route path="/password" element={<ChangePasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Box>
    </>
  );
};

function App() {
  return (
      <Provider store={store}>
        <Router>
          <AppContent />
        </Router>
      </Provider>
  );
}

export default App;
