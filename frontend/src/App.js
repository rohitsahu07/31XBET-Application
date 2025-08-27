// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { Box } from '@mui/material';
import store from './redux/store';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LedgerPage from './pages/LedgerPage';
import HierarchyPage from './pages/HierarchyPage';
import CreateUserPage from './pages/CreateUserPage';
import BetFormPage from './pages/BetFormPage';
import Header from './components/Header';
import SideBar from './components/SideBar';

// Custom component to conditionally render Header
const AppContent = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const showHeader = location.pathname !== '/';

  return (
    <>
      {showHeader && <Header onMenuToggle={handleMenuToggle} />}
      <SideBar open={sidebarOpen} onClose={handleMenuToggle} />
      <Box sx={{ mt: showHeader ? 8 : 0, p: 0 }}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/hierarchy" element={<HierarchyPage />} />
          <Route path="/create-user" element={<CreateUserPage />} />
          <Route path="/bet-form" element={<BetFormPage />} />
        </Routes>
      </Box>
    </>
  );
};

const theme = createTheme({
  palette: {
    primary: { main: '#7C4DFF' },
    background: { default: '#FFFFFF', paper: '#F5F5F5' },
    text: { primary: '#333333', secondary: '#757575' },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 500 },
    body1: { fontSize: '1rem', color: '#333333' },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: '8px', textTransform: 'none' } } },
    MuiCard: { styleOverrides: { root: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } } },
  },
});

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