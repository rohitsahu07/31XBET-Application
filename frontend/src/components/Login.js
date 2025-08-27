// src/components/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Checkbox, FormControlLabel, IconButton } from '@mui/material';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/token/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      const userRes = await axios.get('/api/users/', {
        headers: { Authorization: `Bearer ${res.data.access}` }
      });
      dispatch(setUser(userRes.data[0]));
      navigate('/home'); // Redirect to HomePage after login
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  return (
    <Box className="login-container">
      <IconButton className="user-icon" disabled>
        
      </IconButton>
      <Box className="login-form">
        <Typography variant="h5" gutterBottom align="center">
          Login to Bet Smart
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="Email ID"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            InputProps={{
              className: 'input-field',
            }}
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
            InputProps={{
              className: 'input-field',
            }}
          />
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
            <FormControlLabel
              control={<Checkbox />}
              label="Remember me"
              className="checkbox"
            />
            <Typography variant="body2" className="forgot-password">
              Forgot Password?
            </Typography>
          </Box>
          <Button variant="contained" color="primary" fullWidth type="submit" className="login-button">
            LOGIN
          </Button>
        </form>
      </Box>
    </Box>
  );
};

export default Login;