import React, { useEffect, useState } from "react";
// If your axios helper is at src/services/api.js, change the next line to:
// import axios from "../services/api";
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
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import SectionHeader from "./common_components/PageTitle";

const Statement = () => {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadedAdminUsers, setLoadedAdminUsers] = useState(false);

  // init: figure out if admin & load users list if so
  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get("/api/users/");
        const list = Array.isArray(res.data) ? res.data : [];

        // ✅ Detect if current user is admin
        const currentUser = list.find((u) => u.is_self);
        const admin = currentUser?.is_superuser || false;

        setIsAdmin(admin);
        setUsers(list.filter((u) => !u.is_superuser));
        setLoadedAdminUsers(true);

        // ✅ Fetch own data immediately if not admin
        if (!admin) {
          await fetchStatement();
        }
      } catch (e) {
        console.error("Error loading users:", e);
        setLoadedAdminUsers(true);
      }
    };
    init();
  }, []);


  const fetchStatement = async (userId = null) => {
    try {
      let url = "/api/ledger/statement/";
      if (isAdmin && userId) url += `?user_id=${userId}`;
      const token = sessionStorage.getItem("access_token");
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data || []);
    } catch (err) {
      console.error("Error fetching statement:", err);
      setRows([]);
    }
  };

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    if (userId) fetchStatement(userId);
    else setRows([]);
  };

  const fmt = (v) =>
    (v === null || v === undefined || v === "") ? "0.00" : Number(v).toFixed(2);

  return (
    <Box
      sx={{
        backgroundColor: "#e8e8e8",
        minHeight: "100vh",
        p: 2,
      }}
    >
       <SectionHeader title="💰 My Account Statement" />

      {/* Admin user dropdown */}
      {isAdmin && users.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2, mt: 2 }}>
          <FormControl sx={{ minWidth: 260 }}>
            <InputLabel>Select User</InputLabel>
            <Select
              value={selectedUser}
              label="Select User"
              onChange={handleUserChange}
              renderValue={(value) =>
                value
                  ? users.find((u) => u.id === value)?.username
                  : "Select User"
              }
            >
              <MenuItem value="">
                <em>Select User</em>
              </MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "6px",
          boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
          overflowX: "auto",
          mt: 2
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: "linear-gradient(to right, #00332b, #004d40)",
              }}
            >
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                DATE
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                DESCRIPTION
              </TableCell>
              <TableCell
                align="right"
                sx={{ color: "white", fontWeight: "bold" }}
              >
                Prev. Bal
              </TableCell>
              <TableCell
                align="right"
                sx={{ color: "white", fontWeight: "bold" }}
              >
                CREDIT
              </TableCell>
              <TableCell
                align="right"
                sx={{ color: "white", fontWeight: "bold" }}
              >
                DEBIT
              </TableCell>
              <TableCell
                align="right"
                sx={{ color: "white", fontWeight: "bold" }}
              >
                BALANCE
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  {isAdmin
                    ? loadedAdminUsers
                      ? "Please select a user to view statement."
                      : "Loading users…"
                    : "No statement entries."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow
                  key={i}
                  sx={{
                    backgroundColor: i % 2 === 0 ? "#f9f9f9" : "#ffffff",
                    "&:hover": { backgroundColor: "#e6f7f3" },
                  }}
                >
                  <TableCell>{r.date}</TableCell>
                  <TableCell sx={{ color: "#004d80", fontWeight: 500 }}>
                    {r.description}
                  </TableCell>
                  <TableCell align="right">{fmt(r.prev_balance)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: Number(r.credit) > 0 ? "green" : "rgba(0,0,0,0.6)",
                      fontWeight: Number(r.credit) > 0 ? "bold" : 400,
                    }}
                  >
                    {fmt(r.credit)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: Number(r.debit) > 0 ? "red" : "rgba(0,0,0,0.6)",
                      fontWeight: Number(r.debit) > 0 ? "bold" : 400,
                    }}
                  >
                    {fmt(r.debit)}
                  </TableCell>
                  <TableCell align="right">{fmt(r.balance)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <BackToMainMenuButton />
    </Box>
  );
};

export default Statement;
