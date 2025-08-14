import React, { useState } from 'react';
import axios from 'axios';
import { Box, Button, Select, MenuItem, TextField, FormControl, InputLabel } from '@mui/material';

const BetForm = ({ games }) => {
  const [gameId, setGameId] = useState('');
  const [amount, setAmount] = useState('');

  const handleBet = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    try {
      await axios.post('/api/bets/', { game: gameId, amount: parseFloat(amount) }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Bet placed!');
      setAmount('');
    } catch (err) {
      alert('Error placing bet');
    }
  };

  return (
    <Box component="form" onSubmit={handleBet} sx={{ mt: 2 }}>
      <FormControl fullWidth margin="normal">
        <InputLabel id="game-select-label">Select Game</InputLabel>
        <Select
          labelId="game-select-label"
          value={gameId}
          label="Select Game"
          onChange={(e) => setGameId(e.target.value)}
          required
        >
          {games.map((g) => (
            <MenuItem key={g.id} value={g.id}>
              {g.name} ({g.type} - {g.status})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Amount"
        type="number"
        fullWidth
        margin="normal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <Button variant="contained" color="secondary" fullWidth type="submit" sx={{ mt: 2 }}>
        Place Bet
      </Button>
    </Box>
  );
};

export default BetForm;