import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [rows, setRows] = useState([]); // bets-only endpoint payload
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const fetchLedger = async (userId, adminMode = isAdmin) => {
    if (adminMode && !userId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const url = adminMode
        ? `/api/ledger/my-ledger/?user_id=${encodeURIComponent(userId)}`
        : `/api/ledger/my-ledger/`;
      const res = await axios.get(url, { headers });
      const data = Array.isArray(res.data) ? res.data : [];

      const getTs = (r) =>
        typeof r.sort_ts === "number"
          ? r.sort_ts
          : new Date(r.round_time || r.iso || r.date || 0).getTime();

      data.sort((a, b) => getTs(b) - getTs(a));
      setRows(data);
    } catch (err) {
      console.error("❌ Error fetching MY LEDGER:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
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
        }

        // 3) Decide initial fetch
        const qUserId = searchParams.get("user_id");
        if (admin) {
          if (qUserId) {
            setSelectedUser(qUserId);
            await fetchLedger(qUserId, true); // deep-link
          } else {
            setRows([]); // wait for selection
          }
        } else if (me?.id) {
          await fetchLedger(me.id, false); // self
        }
      } catch (err) {
        console.error("Error fetching users/me for ledger:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    fetchLedger(userId, true);
  };

  const ledgerRows = useMemo(() => {
    const getTs = (r) =>
      typeof r.sort_ts === "number"
        ? r.sort_ts
        : new Date(r.round_time || r.iso || r.date || 0).getTime();

    const sorted = [...(rows || [])].sort((a, b) => getTs(b) - getTs(a));

    const oldest = [...sorted].reverse();
    let running = 0;
    const withCalc = oldest.map((r) => {
      const credit = parseFloat(r.credit || 0) || 0;
      const debit = parseFloat(r.debit || 0) || 0;
      running += credit - debit;
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
    const won = ledgerRows.reduce((s, r) => s + parseFloat(r._won || 0), 0);
    const lost = ledgerRows.reduce((s, r) => s + parseFloat(r._lost || 0), 0);
    const net = (won - lost).toFixed(2);
    return { won: won.toFixed(2), lost: lost.toFixed(2), net };
  }, [ledgerRows]);

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
          {isAdmin ? "Please select a user to view their ledger." : "No data found."}
        </Typography>
      )}

      <BackToMainMenuButton />
    </Box>
  );
};

export default Ledger;
