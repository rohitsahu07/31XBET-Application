import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from '../components/Dashboard';

const DashboardPage = () => {
  const [games, setGames] = useState([]);

  useEffect(() => {
    const fetchGames = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await axios.get('/api/bets/games/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGames(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchGames();
  }, []);

  return <Dashboard games={games} />;
};

export default DashboardPage;