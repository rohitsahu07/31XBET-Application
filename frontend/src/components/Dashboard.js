import React from 'react';
import { useSelector } from 'react-redux';
import HierarchyTree from './HierarchyTree';
import Ledger from './Ledger';
import BetForm from './BetForm';
import { Box, Typography, Paper, Grid, Tabs, Tab, List, ListItem, ListItemText } from '@mui/material';

const Dashboard = ({ games }) => {
  const user = useSelector((state) => state.user.user);

  if (!user) return <Typography>Loading...</Typography>;

  const upcoming = games.filter(g => g.status === 'upcoming');
  const ongoing = games.filter(g => g.status === 'live');

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
        {user.role === 'client' && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6">Place Bet</Typography>
              <BetForm games={games} />
            </Paper>
          </Grid>
        )}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6">Matches</Typography>
            <Tabs value={0} centered>
              <Tab label="Upcoming" />
              <Tab label="Ongoing" />
            </Tabs>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Upcoming Matches</Typography>
              <List>
                {upcoming.length === 0 ? (
                  <ListItem><ListItemText primary="No upcoming matches" /></ListItem>
                ) : (
                  upcoming.map((g) => (
                    <ListItem key={g.id}>
                      <ListItemText primary={g.name} secondary={new Date(g.metadata.date || g.start_time).toLocaleString()} />
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Ongoing Matches (Live Scores)</Typography>
              <List>
                {ongoing.length === 0 ? (
                  <ListItem><ListItemText primary="No ongoing matches" /></ListItem>
                ) : (
                  ongoing.map((g) => (
                    <ListItem key={g.id}>
                      <ListItemText 
                        primary={g.name} 
                        secondary={`Score: ${g.metadata.score || 'Live - No score available yet'} | Status: ${g.status}`} 
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;