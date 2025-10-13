import React, { useEffect, useState, useMemo } from "react";
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
  const [rows, setRows] = useState([]);          // bets-only endpoint payload
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // ────────────────────────────────
  // Fetch users on mount
  // ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/users/");
        const allUsers = res.data || [];
        const current = allUsers.find((u) => u.is_self);
        const admin = current?.is_superuser || false;
        setIsAdmin(admin);
        setUsers(allUsers.filter((u) => !u.is_superuser));

        if (!admin && current?.id) {
          await fetchLedger(current.id, false);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    })();
  }, []);

  // ────────────────────────────────
  // Fetch MY LEDGER (bets only)
  // ────────────────────────────────
  const fetchLedger = async (userId, adminMode = isAdmin) => {
    if (adminMode && !userId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const url = adminMode
        ? `/api/ledger/my-ledger/?user_id=${userId}`
        : `/api/ledger/my-ledger/`;
      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(data);
    } catch (err) {
      console.error("❌ Error fetching MY LEDGER:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    fetchLedger(userId, true);
  };

  // ────────────────────────────────
  // Transform to MY LEDGER table rows with Hisaab
  // ────────────────────────────────
  const ledgerRows = useMemo(() => {
    // Rows are already bets-only and sorted desc by backend; recompute to be safe
    const sorted = [...(rows || [])].sort((a, b) => {
      const ta = new Date(a.round_time || a.date).getTime();
      const tb = new Date(b.round_time || b.date).getTime();
      return tb - ta;
    });

    // Compute cumulative Hisaab (oldest→newest), then flip back
    const oldest = [...sorted].reverse();
    let running = 0;
    const withCalc = oldest.map((r) => {
      const credit = parseFloat(r.credit || 0) || 0;
      const debit  = parseFloat(r.debit  || 0) || 0;
      running += (credit - debit);
      return {
        ...r,
        _won: credit.toFixed(2),
        _lost: debit.toFixed(2),
        _hisaab: running.toFixed(2),
      };
    });
    return withCalc.reverse().map((r) => {
      const desc = `${r.description || "Teen Patti T20"} (${r.date || ""})`;
      return { ...r, __desc: desc, __wonBy: r.won_by || "" };
    });
  }, [rows]);

  const totals = useMemo(() => {
    const won  = ledgerRows.reduce((s, r) => s + parseFloat(r._won  || 0), 0);
    const lost = ledgerRows.reduce((s, r) => s + parseFloat(r._lost || 0), 0);
    const net = (won - lost).toFixed(2);
    return { won: won.toFixed(2), lost: lost.toFixed(2), net };
  }, [ledgerRows]);

  // ────────────────────────────────
  // Render
  // ────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      <SectionHeader title="MY LEDGER" />

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
      ) : ledgerRows.length > 0 ? (
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
              {ledgerRows.map((rec, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    backgroundColor:
                      parseFloat(rec._won) > 0
                        ? "rgba(76, 175, 80, 0.1)"
                        : parseFloat(rec._lost) > 0
                        ? "rgba(244, 67, 54, 0.1)"
                        : "inherit",
                  }}
                >
                  <TableCell>
                    <span style={{ color: "#0b57d0", fontWeight: 600 }}>
                      {rec.__desc}
                    </span>
                  </TableCell>
                  <TableCell>{rec.__wonBy || "-"}</TableCell>
                  <TableCell align="center" style={{ color: "green", fontWeight: 600 }}>
                    {rec._won}
                  </TableCell>
                  <TableCell align="center" style={{ color: "red", fontWeight: 600 }}>
                    {rec._lost}
                  </TableCell>
                  <TableCell align="center" style={{ fontWeight: 700 }}>
                    {rec._hisaab}
                  </TableCell>
                </TableRow>
              ))}

              <TableRow sx={{ background: "#f1f8e9" }}>
                <TableCell sx={{ fontWeight: "bold" }}>TOTAL</TableCell>
                <TableCell />
                <TableCell align="center" sx={{ color: "green", fontWeight: "bold" }}>
                  ₹ {totals.won}
                </TableCell>
                <TableCell align="center" sx={{ color: "red", fontWeight: "bold" }}>
                  ₹ {totals.lost}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  ₹ {totals.net}
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
