// frontend/src/components/Dashboard.js

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import HierarchyTree from './HierarchyTree';
import Ledger from './Ledger';
import BetForm from './BetForm';
import CreateUserForm from './CreateUserForm';
import { Box, Typography, Paper, Grid, Tabs, Tab, List, ListItem, ListItemText } from '@mui/material';

const Dashboard = ({ games }) => {
  const user = useSelector((state) => state.user.user);
  const [matches, setMatches] = useState([]);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await axios.get(
          `https://api.cricapi.com/v1/cricScore?apikey=${process.env.REACT_APP_CRICKET_API_KEY}`
        );
        const data = response.data.data || [];
        setMatches(data);
      } catch (err) {
        console.error('Error fetching matches from API', err);
      }
    };
    fetchMatches();
  }, []);

  if (!user) return <Typography>Loading...</Typography>;

  let allowedRole = null;
  if (user.role === 'super_admin') allowedRole = 'master_admin';
  else if (user.role === 'master_admin') allowedRole = 'admin';
  else if (user.role === 'admin') allowedRole = 'client';

  // categorize matches
  const upcoming = matches.filter(
    (m) => m.ms?.toLowerCase() === 'match not started' || m.status?.toLowerCase() === 'upcoming'
  );
  const ongoing = matches.filter(
    (m) => m.ms?.toLowerCase() === 'live' || m.status?.toLowerCase() === 'live'
  );
  const completed = matches.filter(
    (m) => m.ms?.toLowerCase() === 'result' || m.status?.toLowerCase() === 'completed'
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6">Create {allowedRole}</Typography>
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
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6">Cricket Matches</Typography>
            <Tabs value={tabValue} onChange={handleTabChange} centered>
              <Tab label="Upcoming" />
              <Tab label="Ongoing" />
              <Tab label="Completed" />
            </Tabs>
            <Box sx={{ mt: 2 }}>
              {tabValue === 0 && (
                <List>
                  {upcoming.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="No upcoming matches" />
                    </ListItem>
                  ) : (
                    upcoming.map((m, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${m.t1} vs ${m.t2}`}
                          secondary={`Match Type: ${
                            m.matchType || 'N/A'
                          } | Date: ${
                            m.dateTimeGMT
                              ? new Date(m.dateTimeGMT).toLocaleString()
                              : 'N/A'
                          } | Series: ${m.series || 'N/A'}`}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              )}
              {tabValue === 1 && (
                <List>
                  {ongoing.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="No ongoing matches" />
                    </ListItem>
                  ) : (
                    ongoing.map((m, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${m.t1} vs ${m.t2}`}
                          secondary={`Score: ${m.t1s || 'N/A'} vs ${
                            m.t2s || 'N/A'
                          } | Match Type: ${
                            m.matchType || 'N/A'
                          } | Date: ${
                            m.dateTimeGMT
                              ? new Date(m.dateTimeGMT).toLocaleString()
                              : 'N/A'
                          } | Series: ${m.series || 'N/A'}`}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              )}
              {tabValue === 2 && (
                <List>
                  {completed.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="No completed matches" />
                    </ListItem>
                  ) : (
                    completed.map((m, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${m.t1} vs ${m.t2}`}
                          secondary={`Score: ${m.t1s || 'N/A'} vs ${
                            m.t2s || 'N/A'
                          } | Result: ${m.ms || m.status || 'N/A'} | Winner: ${
                            m.status || 'N/A'
                          } | Match Type: ${
                            m.matchType || 'N/A'
                          } | Date: ${
                            m.dateTimeGMT
                              ? new Date(m.dateTimeGMT).toLocaleString()
                              : 'N/A'
                          } | Series: ${m.series || 'N/A'}`}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
