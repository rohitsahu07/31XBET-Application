import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // We'll update this file below
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },  // Blue for buttons/links
    secondary: { main: '#4caf50' },  // Green for betting actions
    background: { default: '#f5f5f5' },  // Light gray background
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />  {/* Resets CSS for consistency */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

reportWebVitals();