import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Stack
} from '@mui/material';
import Chips from './Chips';

const Inplay = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await axios.get('/api/bets/cricket/matches/');
        const data = response.data?.data || [];
        setMatches(data);
      } catch (err) {
        console.error('Error fetching matches from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '90vh',   // full screen height
        }}
      >
        <CircularProgress color="success" />
      </Box>
    );
  }

  return (
    <Box p={2}>
      {matches.length === 0 ? (
        <Typography align="center" color="text.secondary">
          No matches available
        </Typography>
      ) : (
        <Stack spacing={2}>
          {matches.map((match, index) => (
            <Card
              key={index}
              variant="outlined"
              sx={{
                borderRadius: 2,
                width: '100%',        // Full width
                boxShadow: 1
              }}
            >
              <CardContent>
                {/* Top Row: Icons + Date */}
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Chips />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    {new Date(match.dateTimeGMT).toLocaleString()}
                  </Typography>
                </Stack>

                {/* Match Title */}
                <Typography variant="subtitle1" fontWeight="bold">
                  {match.t1} v {match.t2}
                </Typography>

                {/* Series */}
                <Typography variant="body2" color="text.secondary">
                  {match.series}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default Inplay;
