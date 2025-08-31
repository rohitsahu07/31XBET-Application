// src/components/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { FaUserCircle } from "react-icons/fa";
// import { Box, Button, TextField, IconButton, Link, InputAdornment } from '@mui/material';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Reset error states before each submit
    setUsernameError(false);
    setUsernameErrorMessage('');
    setPasswordError(false);
    setPasswordErrorMessage('');

    try {
      const res = await axios.post('/api/token/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      const userRes = await axios.get('/api/users/', {
        headers: { Authorization: `Bearer ${res.data.access}` }
      });
      dispatch(setUser(userRes.data[0]));
      navigate('/rules');
    } catch (err) {
      console.error('Login failed', err);
      
      // Set custom error messages for both fields on server error
      setUsernameError(true);
      setUsernameErrorMessage('Wrong username');
      setPasswordError(true);
      setPasswordErrorMessage('Wrong password');
    }
  };

  return (
    <div className="login-body">
      <div className="container">
        <img src="frontend_assets/main_logo.png" alt="main" width={120} height={120} />

        <form onSubmit={handleLogin} style={{ marginTop: "10px" }}>
          <input 
            type="text" 
            placeholder="Username" 
            className="input-field mt-2" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            id="username" 
            name="username" 
            autoComplete="username" 
            autoFocus 
          />
          {usernameError && <div className="error-message">{usernameErrorMessage}</div>}

          <input 
            type="password" 
            placeholder="Password" 
            className="input-field" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            id="password" 
            name="password" 
            autoComplete="current-password" 
          />
          {passwordError && <div className="error-message">{passwordErrorMessage}</div>}

          <RouterLink to="/forgot-password" className="forgot">forgot password?</RouterLink>

          <button className="btn" type="submit">Sign in</button>
        </form>

        <RouterLink to="/register" className="register">register</RouterLink>
      </div>
    </div>
  );
};

export default Login;