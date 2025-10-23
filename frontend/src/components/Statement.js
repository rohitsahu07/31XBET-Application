import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "../services/api";
import {
  Box,
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
  const [searchParams] = useSearchParams();

  const fmt = (v) =>
    v === null || v === undefined || v === "" ? "0.00" : Number(v).toFixed(2);

  const fetchStatement = async (userId = null, adminMode = null) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const admin = adminMode ?? isAdmin;
      let url = "/api/ledger/statement/";
      if (admin && userId) url += `?user_id=${encodeURIComponent(userId)}`;
      const res = await axios.get(url, { headers });
      const data = Array.isArray(res.data) ? res.data : [];
      const getTs = (r) =>
        typeof r.sort_ts === "number"
          ? r.sort_ts
          : new Date(r.iso || r.date || 0).getTime();
      data.sort((a, b) => getTs(b) - getTs(a));
      setRows(data);
    } catch (err) {
      console.error("Error fetching statement:", err);
      setRows([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // 1) Determine role from /me
        const meRes = await axios.get("/api/users/me/");
        const me = meRes.data || {};
        const admin = !!(me.is_superuser || me.is_staff);
        setIsAdmin(admin);

        // 2) If admin, populate dropdown list
        if (admin) {
          const listRes = await axios.get("/api/users/");
          const list = Array.isArray(listRes.data) ? listRes.data : [];
          setUsers(list.filter((u) => !u.is_superuser));
          setLoadedAdminUsers(true);
        } else {
          setLoadedAdminUsers(true);
        }

        // 3) Decide initial fetch
        const qUserId = searchParams.get("user_id");
        if (admin) {
          if (qUserId) {
            setSelectedUser(qUserId);
            await fetchStatement(qUserId, true);
          } else {
            setRows([]); // wait for admin to pick
          }
        } else {
          await fetchStatement(null, false); // self
        }
      } catch (e) {
        console.error("Error during Statement init:", e);
        setLoadedAdminUsers(true);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // re-run if query changes

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    if (userId) fetchStatement(userId, true);
    else setRows([]);
  };

  return (
    <Box sx={{ backgroundColor: "#e8e8e8", minHeight: "100vh", p: 2 }}>
      <SectionHeader title="My Account Statement" />

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

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "6px",
          boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
          overflowX: "auto",
          mt: 2,
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: "linear-gradient(to right, #00332b, #004d40)",
              }}
            >
              {["DATE", "DESCRIPTION", "Prev. Bal", "CREDIT", "DEBIT", "BALANCE"].map(
                (head, i) => (
                  <TableCell
                    key={i}
                    align={i >= 2 ? "right" : "left"}
                    sx={{ color: "white", fontWeight: "bold" }}
                  >
                    {head}
                  </TableCell>
                )
              )}
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
