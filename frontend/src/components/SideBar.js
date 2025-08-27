// src/components/SideBar.js
import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemText, Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { FaHome, FaChartLine, FaList, FaUsers, FaUserPlus, FaDice } from 'react-icons/fa';

const SideBar = ({ open, onClose }) => {
  const menuItems = [
    { text: 'Home', path: '/home', icon: <FaHome /> },
    { text: 'Dashboard', path: '/dashboard', icon: <FaChartLine /> },
    { text: 'Ledger', path: '/ledger', icon: <FaList /> },
    { text: 'Hierarchy', path: '/hierarchy', icon: <FaUsers /> },
    { text: 'Create User', path: '/create-user', icon: <FaUserPlus /> },
    { text: 'Place Bet', path: '/bet-form', icon: <FaDice /> },
  ];

  const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 18L18 6M6 6L18 18" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 260,
          backgroundColor: '#ffffff',
          boxShadow: '4px 0 15px rgba(0, 0, 0, 0.2)',
          borderRight: '2px solid #e0e0e0',
          borderRadius: '0 10px 10px 0',
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          backgroundColor: '#7C4DFF',
          color: '#ffffff',
          textAlign: 'center',
          borderBottom: '2px solid #6a1bff',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          BetSmart
        </Typography>
      </Box>
      <Box
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: '#333333',
          }}
        >
          <CloseIcon />
        </button>
      </Box>
      <Box
        role="presentation"
        onClick={onClose}
        onKeyDown={onClose}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                sx={{
                  '&:hover': { backgroundColor: '#f0f0f0' },
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ mr: 2, color: '#7C4DFF' }}>{item.icon}</Box>
                <ListItemText primary={item.text} sx={{ color: '#333333', fontWeight: 500 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default SideBar;