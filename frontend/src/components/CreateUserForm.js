// frontend/src/components/CreateUserForm.js (full)

import React, { useState } from 'react';
import axios from 'axios';
import { Box, Button, TextField, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';

const CreateUserForm = ({ allowedRole }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    try {
      await axios.post('/api/users/', { username, password, role: allowedRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('User created!');
      setUsername('');
      setPassword('');
      // Optional: Refresh dashboard or hierarchy
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || 'Failed to create user'));
    }
  };

  if (!allowedRole) return null;

  return (
    <Box component="form" onSubmit={handleCreate} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Create {allowedRole.charAt(0).toUpperCase() + allowedRole.slice(1)}
      </Typography>
      <TextField
        label="Username"
        variant="outlined"
        fullWidth
        margin="normal"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <TextField
        label="Password"
        type="password"
        variant="outlined"
        fullWidth
        margin="normal"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>Role</InputLabel>
        <Select value={allowedRole} label="Role" disabled>
          <MenuItem value={allowedRole}>{allowedRole}</MenuItem>
        </Select>
      </FormControl>
      <Button variant="contained" color="primary" fullWidth type="submit" sx={{ mt: 2 }}>
        Create
      </Button>
    </Box>
  );
};

export default CreateUserForm;