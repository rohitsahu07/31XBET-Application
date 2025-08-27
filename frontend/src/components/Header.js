// src/components/Header.js
import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12H21M3 6H21M3 18H21" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Header = ({ onMenuToggle }) => {
  return (
    <AppBar position="sticky" color="default" sx={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toolbar>
        <button
          onClick={onMenuToggle}
          style={{
            marginRight: '16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          <HamburgerIcon />
        </button>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#7C4DFF' }}>
          BetSmart
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;