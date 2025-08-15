// frontend/src/components/Dashboard.js (updated to include CreateUserForm)

import React from 'react';
import { useSelector } from 'react-redux';
import HierarchyTree from './HierarchyTree';
import Ledger from './Ledger';
import BetForm from './BetForm';
import CreateUserForm from './CreateUserForm';
import { Box, Typography, Paper, Grid } from '@mui/material';

const Dashboard = ({ games }) => {
  const user = useSelector((state) => state.user.user);

  if (!user) return <Typography>Loading...</Typography>;

  let allowedRole = null;
  if (user.role === 'super_admin') allowedRole = 'master_admin';
  else if (user.role === 'master_admin') allowedRole = 'admin';
  else if (user.role === 'admin') allowedRole = 'client';

  return (
    <Box className="dashboard-container" p={3}>
      <Typography variant="h4" gutterBottom>
        Welcome, {user.username} ({user.role})
      </Typography>
      <Typography variant="h6" gutterBottom>
        Balance: ${user.balance}
      </Typography>
      <Grid container spacing={3}>
        {user.role !== 'client' && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6">Hierarchy</Typography>
              <HierarchyTree />
            </Paper>
          </Grid>
        )}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6">Ledger</Typography>
            <Ledger />
          </Paper>
        </Grid>
        {allowedRole && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <CreateUserForm allowedRole={allowedRole} />
            </Paper>
          </Grid>
        )}
        {user.role === 'client' && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6">Place Bet</Typography>
              <BetForm games={games} />
            </Paper>
          </Grid>
        )}
        {/* Matches panel and other sections */}
      </Grid>
    </Box>
  );
};

export default Dashboard;