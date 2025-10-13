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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // ────────────────────────────────
  // Fetch users on mount
  // ────────────────────────────────
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users/");
      const allUsers = res.data || [];

      const current = allUsers.find((u) => u.is_self);
      const admin = current?.is_superuser || false;
      setIsAdmin(admin);
      setUsers(allUsers.filter((u) => !u.is_superuser));

      // ✅ If not admin → auto-fetch own ledger
      if (!admin && current?.id) {
        await fetchLedger(current.id);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // ────────────────────────────────
  // Fetch ledger statement
  // ────────────────────────────────
  const fetchLedger = async (userId) => {
    if (isAdmin && !userId) {
      setRecords([]);
      setSummary({ totalWin: 0, totalLoss: 0, net: 0 });
      return;
    }

    setLoading(true);
    try {
      const url = isAdmin
        ? `/api/ledger/statement/?user_id=${userId}`
        : `/api/ledger/statement/`;

      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data.ledger || [];

      console.log("📊 [Ledger] Received", data.length, "rows from backend");

      // Calculate totals
      const totalWin = data.reduce(
        (sum, r) => sum + parseFloat(r.credit || 0),
        0
      );
      const totalLoss = data.reduce(
        (sum, r) => sum + parseFloat(r.debit || 0),
        0
      );
      const net = (totalWin - totalLoss).toFixed(2);

      setRecords(data);
      setSummary({
        totalWin: totalWin.toFixed(2),
        totalLoss: totalLoss.toFixed(2),
        net,
      });
    } catch (err) {
      console.error("❌ Error fetching ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    fetchLedger(userId);
  };

  // ────────────────────────────────
  // Render
  // ────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      <SectionHeader title="📜 LEDGER" />

      {isAdmin && (
        <FormControl sx={{ mt: 2, mb: 2, minWidth: 240 }}>
          <InputLabel>Select User</InputLabel>
          <Select
            value={selectedUser}
            displayEmpty
            onChange={handleUserChange}
            renderValue={(value) =>
              value
                ? users.find((u) => u.id === value)?.username
                : "Select User"
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
      )}

      {loading ? (
        <Typography
          variant="body1"
          sx={{ mt: 4, textAlign: "center", color: "#ccc" }}
        >
          Loading ledger data...
        </Typography>
      ) : records.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ background: "#004d40" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  DATE
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  DESCRIPTION
                </TableCell>
                <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                  CREDIT
                </TableCell>
                <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                  DEBIT
                </TableCell>
                <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                  BALANCE
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {records.map((rec, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    backgroundColor:
                      parseFloat(rec.credit) > 0
                        ? "rgba(76, 175, 80, 0.1)"
                        : parseFloat(rec.debit) > 0
                        ? "rgba(244, 67, 54, 0.1)"
                        : "inherit",
                  }}
                >
                  <TableCell>{rec.date}</TableCell>
                  <TableCell>{rec.description}</TableCell>
                  <TableCell align="center" sx={{ color: "green", fontWeight: 600 }}>
                    {parseFloat(rec.credit || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "red", fontWeight: 600 }}>
                    {parseFloat(rec.debit || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="center">{rec.balance}</TableCell>
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
          {isAdmin
            ? "Please select a user to view their ledger."
            : "No data found."}
        </Typography>
      )}

      <BackToMainMenuButton />
    </Box>
  );
};

export default Ledger;
