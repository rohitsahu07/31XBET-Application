import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // We'll update this file below
import './styles/main.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: { main: "#00A86B" }, // Green tone
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
        root: {
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          borderRadius: "12px",
        },
      },
    },
  },
});


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />  {/* Resets CSS for consistency */}
      <App />
    </ThemeProvider>
  // </React.StrictMode>
);

reportWebVitals();