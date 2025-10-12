import React, { useEffect, useState } from "react";
import axios from "../services/api";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import SectionHeader from "./common_components/PageTitle";

const Ledger = () => {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [summary, setSummary] = useState({ totalWin: 0, totalLoss: 0, net: 0 });

  useEffect(() => {
    fetchUsers();
    // ⚠️ Don’t fetch any ledger until a user is selected
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users/");
      const filtered = (res.data || []).filter((u) => !u.is_superuser);
      setUsers(filtered);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchLedger = async (userId) => {
    if (!userId) {
      setRecords([]); // clear table
      setSummary({ totalWin: 0, totalLoss: 0, net: 0 });
      return;
    }

    try {
      const res = await axios.get(`/api/bets/?user_id=${userId}`);
      const data = res.data;

      const totalWin = data
        .reduce((sum, r) => sum + parseFloat(r.credit || 0), 0)
        .toFixed(2);
      const totalLoss = data
        .reduce((sum, r) => sum + parseFloat(r.debit || 0), 0)
        .toFixed(2);
      const net = (totalWin - totalLoss).toFixed(2);
      setRecords(data);
      setSummary({ totalWin, totalLoss, net });
    } catch (err) {
      console.error("Error fetching ledger:", err);
    }
  };

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    fetchLedger(userId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <SectionHeader title="📜 LEDGER" />

      {/* Dropdown now truly starts empty */}
      <FormControl sx={{ mt: 2, mb: 2, minWidth: 240 }}>
        <InputLabel>Select User</InputLabel>
        <Select
          value={selectedUser}
          displayEmpty
          onChange={handleUserChange}
          renderValue={(value) =>
            value ? users.find((u) => u.id === value)?.username : "Select User"
          }
        >
          <MenuItem disabled value="">
            <em>Select User</em>
          </MenuItem>
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.username}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Table renders only if there’s data */}
      {records.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ background: "#004d40" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  DESCRIPTION
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  WON BY
                </TableCell>
                <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                  WON
                </TableCell>
                <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                  LOST
                </TableCell>
                <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                  HISAAB
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {records.map((rec) => (
                <TableRow
                  key={rec.id}
                  sx={{
                    backgroundColor:
                      rec.status === "won"
                        ? "rgba(76, 175, 80, 0.1)"
                        : "rgba(244, 67, 54, 0.1)",
                  }}
                >
                  <TableCell>{rec.description}</TableCell>
                  <TableCell>{rec.won_by}</TableCell>
                  <TableCell align="center" sx={{ color: "green", fontWeight: 600 }}>
                    {parseFloat(rec.credit).toFixed(2)}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "red", fontWeight: 600 }}>
                    {parseFloat(rec.debit).toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    {(parseFloat(rec.credit) - parseFloat(rec.debit)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}

              <TableRow sx={{ background: "#f1f8e9" }}>
                <TableCell sx={{ fontWeight: "bold" }}>TOTAL</TableCell>
                <TableCell />
                <TableCell align="center" sx={{ color: "green", fontWeight: "bold" }}>
                  ₹ {summary.totalWin}
                </TableCell>
                <TableCell align="center" sx={{ color: "red", fontWeight: "bold" }}>
                  ₹ {summary.totalLoss}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  ₹ {summary.net}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography
          variant="body1"
          sx={{ mt: 4, textAlign: "center", color: "#ccc" }}
        >
          Please select a user to view their ledger.
        </Typography>
      )}
      <BackToMainMenuButton />
    </Box>
  );
};

export default Ledger;
