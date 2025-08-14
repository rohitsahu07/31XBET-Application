import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';

const Ledger = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    axios.get('/api/ledger/', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTransactions(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: { xs: 300, md: 650 } }} aria-label="ledger table">
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Timestamp</TableCell>
            <TableCell>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{tx.type}</TableCell>
              <TableCell align="right">{tx.amount}</TableCell>
              <TableCell align="right">{tx.timestamp}</TableCell>
              <TableCell>{tx.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default Ledger;