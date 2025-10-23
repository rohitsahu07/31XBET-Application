// frontend/src/components/Usermanagement.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import Swal from "sweetalert2";
import api from "../services/api";
import SectionHeader from "./common_components/PageTitle";

// ---------- tiny, reusable status pill ----------
function StatusPill({ active }) {
  const dotColor = active ? "#22c55e" : "#64748b"; // green / slate
  const label = active ? "Active" : "Inactive";
  const bg = active ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)";
  const border = active ? "rgba(34,197,94,0.45)" : "rgba(148,163,184,0.45)";
  const shadow = active
    ? "0 0 0 3px rgba(34,197,94,0.10) inset"
    : "0 0 0 3px rgba(148,163,184,0.10) inset";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        py: 0.5,
        gap: 1,
        borderRadius: "999px",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        bgcolor: bg,
        border: "1px solid",
        borderColor: border,
        boxShadow: shadow,
        userSelect: "none",
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: dotColor,
          boxShadow: `0 0 0 3px ${active ? "rgba(34,197,94,.25)" : "rgba(100,116,139,.25)"}`,
        }}
      />
      {label}
    </Box>
  );
}

function Usermanagement() {
  const [users, setUsers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [activeFirst, setActiveFirst] = useState(true); // sort by status
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const fmtINR = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users/");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleAddUser = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Create New User",
      html: `
        <input id="swal-username" class="swal2-input" placeholder="Username" />
        <input id="swal-password" class="swal2-input" placeholder="Password (optional)" />
        <input id="swal-balance" type="number" class="swal2-input" placeholder="Initial Coins" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create",
      background: "#1E1E1E",
      color: "#fff",
      preConfirm: () => ({
        username: document.getElementById("swal-username").value,
        password: document.getElementById("swal-password").value,
        balance: document.getElementById("swal-balance").value,
      }),
    });

    if (!formValues?.username) return;

    try {
      const res = await api.post("/api/users/", formValues);
      const details = res.data.login_details;

      const copyText = `Dear Client, your login details are:\n\nURL: ${details.url}\nChip ID: ${details.chip_code}\nUsername: ${details.username}\nPassword: ${details.password}`;

      await Swal.fire({
        title: "User Created Successfully 🎉",
        html: `
          <div style="text-align:left; line-height:1.6">
            <b>Dear Client, your login details are:</b><br/><br/>
            <b>URL:</b> ${details.url}<br/>
            <b>User ID:</b> ${details.username}<br/>
            <b>Password:</b> ${details.password}<br/><br/>
            <button id="copyDetailsBtn" class="swal2-confirm swal2-styled" style="background-color:#3b82f6;">Copy Details</button>
          </div>
        `,
        showConfirmButton: false,
        background: "#1E1E1E",
        color: "#fff",
        didOpen: () => {
          document.getElementById("copyDetailsBtn").onclick = () => {
            navigator.clipboard.writeText(copyText);
            Swal.fire("Copied!", "User details copied to clipboard", "success");
          };
        },
      });

      fetchUsers();
    } catch (err) {
      console.error("Error creating user:", err);
      Swal.fire("Error", "Failed to create user", "error");
    }
  };

  const handleDeposit = async () => {
    const { value: amount } = await Swal.fire({
      title: "Deposit Coins",
      input: "number",
      inputPlaceholder: "Enter amount",
      showCancelButton: true,
      confirmButtonText: "Deposit",
      background: "#1E1E1E",
      color: "#fff",
    });

    if (!amount) return;
    try {
      await api.post(`/api/users/${selectedUser.id}/deposit/`, { amount });
      Swal.fire("Success", `${fmtINR(amount)} added successfully`, "success");
      fetchUsers();
    } catch (err) {
      Swal.fire("Error", "Failed to deposit coins", "error");
    }
    handleMenuClose();
  };

  const handleWithdraw = async () => {
    const { value: amount } = await Swal.fire({
      title: "Withdraw Coins",
      input: "number",
      inputPlaceholder: "Enter amount",
      showCancelButton: true,
      confirmButtonText: "Withdraw",
      background: "#1E1E1E",
      color: "#fff",
    });

    if (!amount) return;
    try {
      const res = await api.post(`/api/users/${selectedUser.id}/withdraw/`, { amount });
      Swal.fire("Success", res.data.message, "success");
      fetchUsers();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.error || "Failed to withdraw", "error");
    }
    handleMenuClose();
  };

  const handleResetPassword = async () => {
    try {
      const res = await api.post(`/api/users/${selectedUser.id}/reset_password/`);
      const newPassword = res.data.new_password;

      Swal.fire({
        title: "Password Reset",
        html: `
          <div style="font-size:16px;">
            <b>New Password:</b> <span id="pw">${newPassword}</span><br/><br/>
            <button id="copyBtn" class="swal2-confirm swal2-styled" style="background-color:#3b82f6;">Copy Password</button>
          </div>
        `,
        showConfirmButton: false,
        background: "#1E1E1E",
        color: "#fff",
        didOpen: () => {
          document.getElementById("copyBtn").onclick = () => {
            navigator.clipboard.writeText(newPassword);
            Swal.fire("Copied!", "Password copied to clipboard", "success");
          };
        },
      });
    } catch (err) {
      Swal.fire("Error", "Failed to reset password", "error");
    }
    handleMenuClose();
  };

  const handleEditProfile = async () => {
    const { value: username } = await Swal.fire({
      title: "Edit Username",
      input: "text",
      inputPlaceholder: "Enter new name",
      showCancelButton: true,
      confirmButtonText: "Save",
      background: "#1E1E1E",
      color: "#fff",
    });

    if (!username) return;
    try {
      const res = await api.post(`/api/users/${selectedUser.id}/edit_name/`, { username });
      Swal.fire("Updated", res.data.message, "success");
      fetchUsers();
    } catch (err) {
      Swal.fire("Error", "Failed to update name", "error");
    }
    handleMenuClose();
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;
    const nextState = !selectedUser.is_active;
    const actionTitle = nextState ? "Activate ID" : "Deactivate ID";

    const confirm = await Swal.fire({
      title: actionTitle,
      text: `Are you sure you want to ${nextState ? "activate" : "deactivate"} "${selectedUser.username}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: nextState ? "Activate" : "Deactivate",
      background: "#1E1E1E",
      color: "#fff",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await api.post(`/api/users/${selectedUser.id}/toggle_active/`);
      Swal.fire("Done", res.data.message, "success");
      fetchUsers();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.error || "Action failed", "error");
    }
    handleMenuClose();
  };

  const handleStatement = () => {
    if (!selectedUser) return;
    navigate(`/statement?user_id=${selectedUser.id}`);
    handleMenuClose();
  };

  const handleLedger = () => {
    if (!selectedUser) return;
    navigate(`/ledger?user_id=${selectedUser.id}`);
    handleMenuClose();
  };

  // counts for filter labels
  const counts = useMemo(() => {
    const total = users.length || 0;
    const active = users.filter((u) => u.is_active).length || 0;
    return { total, active, inactive: total - active };
  }, [users]);

  // filtered + sorted view
  const visibleUsers = useMemo(() => {
    let data = Array.isArray(users) ? [...users] : [];
    if (statusFilter === "active") data = data.filter((u) => u.is_active);
    if (statusFilter === "inactive") data = data.filter((u) => !u.is_active);
    data.sort((a, b) => {
      const av = a.is_active ? 1 : 0;
      const bv = b.is_active ? 1 : 0;
      return activeFirst ? bv - av : av - bv;
    });
    return data;
  }, [users, statusFilter, activeFirst]);

  return (
    <Box sx={{ backgroundColor: "#e8e8e8", minHeight: "100vh", p: 2 }}>
      <SectionHeader title="👥 User Management" />

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, mb: 1, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          sx={{ backgroundColor: "#16a34a", "&:hover": { backgroundColor: "#15803d" } }}
          onClick={handleAddUser}
        >
          + Add User
        </Button>

        {/* Filters + Sort */}
        <Stack direction="row" spacing={1} sx={{ ml: { xs: 0, md: 2 } }}>
          <Button
            size="small"
            variant={statusFilter === "all" ? "contained" : "outlined"}
            onClick={() => setStatusFilter("all")}
          >
            All ({counts.total})
          </Button>
          <Button
            size="small"
            variant={statusFilter === "active" ? "contained" : "outlined"}
            onClick={() => setStatusFilter("active")}
          >
            Active ({counts.active})
          </Button>
          <Button
            size="small"
            variant={statusFilter === "inactive" ? "contained" : "outlined"}
            onClick={() => setStatusFilter("inactive")}
          >
            Inactive ({counts.inactive})
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<SwapVertIcon />}
            onClick={() => setActiveFirst((v) => !v)}
            title={activeFirst ? "Sort: Active → Inactive" : "Sort: Inactive → Active"}
          >
            {activeFirst ? "Active → Inactive" : "Inactive → Active"}
          </Button>
        </Stack>
      </Stack>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "8px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          overflowX: "auto",
          mt: 2,
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ background: "linear-gradient(to right, #00332b, #004d40)" }}>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>USERNAME</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>BALANCE</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">
                STATUS
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {visibleUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              visibleUsers.map((user, i) => (
                <TableRow
                  key={user.id}
                  hover
                  sx={{
                    backgroundColor: i % 2 === 0 ? "#fbfbfb" : "#ffffff",
                    "&:hover": { backgroundColor: "#f0fffa" },
                    // subtle left accent based on status
                    position: "relative",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: user.is_active ? "rgba(34,197,94,0.9)" : "rgba(100,116,139,0.7)",
                      borderTopLeftRadius: 6,
                      borderBottomLeftRadius: 6,
                    },
                  }}
                >
                  <TableCell sx={{ color: "#004d80", fontWeight: 600 }}>{user.username}</TableCell>
                  <TableCell sx={{ color: "#000" }}>{fmtINR(user.balance)}</TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={
                        user.is_active
                          ? "Active – can log in and play"
                          : "Inactive – login is blocked"
                      }
                      arrow
                    >
                      <span>
                        <StatusPill active={user.is_active} />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="inherit" onClick={(e) => handleMenuOpen(e, user)}>
                      <MoreVertIcon sx={{ color: "#000" }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 6,
          sx: {
            backgroundColor: "#1E1E1E",
            color: "#fff",
            borderRadius: 1,
            minWidth: 200,
            paddingY: 0.5,
          },
        }}
      >
        <MenuItem onClick={handleDeposit}>Deposit</MenuItem>
        <MenuItem onClick={handleWithdraw}>Withdraw</MenuItem>
        <MenuItem onClick={handleResetPassword}>Reset Password</MenuItem>
        <MenuItem onClick={handleStatement}>View Statement</MenuItem>
        <MenuItem onClick={handleLedger}>View Ledger</MenuItem>
        <MenuItem onClick={handleEditProfile}>Edit Profile</MenuItem>
        <MenuItem onClick={async () => { await handleToggleActive(); }}>
          {selectedUser?.is_active ? "Deactivate ID" : "Activate ID"}
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Usermanagement;
