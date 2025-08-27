// src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Grid, Button, Typography } from '@mui/material';

const HomePage = () => {
  return (
    <Box sx={{ p: 3, backgroundColor: 'background.default' }}>
      <Typography variant="h4" align="center" gutterBottom>
        BetSmart Home Page
      </Typography>
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={6} md={4}>
          <Button component={Link} to="/dashboard" variant="contained" fullWidth sx={{ height: 100 }}>
            Dashboard
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button component={Link} to="/ledger" variant="contained" fullWidth sx={{ height: 100 }}>
            Ledger
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button component={Link} to="/hierarchy" variant="contained" fullWidth sx={{ height: 100 }}>
            Hierarchy
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button component={Link} to="/create-user" variant="contained" fullWidth sx={{ height: 100 }}>
            Create User
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button component={Link} to="/bet-form" variant="contained" fullWidth sx={{ height: 100 }}>
            Place Bet
          </Button>
        </Grid>
        {/* Add more buttons for other pages as needed */}
      </Grid>
    </Box>
  );
};

export default HomePage;