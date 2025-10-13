import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Swal from "sweetalert2";
import api from "../services/api";
import SectionHeader from "./common_components/PageTitle";

function Usermanagement() {
  const [users, setUsers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  /** ───────────────────────────────
   * 📦 Fetch All Users
   * ─────────────────────────────── */
  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users/");
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /** ───────────────────────────────
   * ⚙️ Menu Handlers
   * ─────────────────────────────── */
  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  /** ───────────────────────────────
   * ➕ Create New User
   * ─────────────────────────────── */
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

  /** ───────────────────────────────
   * 💰 Deposit / Withdraw / Reset / Edit
   * ─────────────────────────────── */
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
      Swal.fire("Success", `₹${amount} added successfully`, "success");
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

  const handleStatement = () => {
    handleMenuClose();
    navigate("/statement");
  };

  /** ───────────────────────────────
   * 🎨 UI Rendering
   * ─────────────────────────────── */
  return (
    <Box sx={{ backgroundColor: "#e8e8e8", minHeight: "100vh", p: 2 }}>
      <SectionHeader title="👥 User Management" />

      <Button
        variant="contained"
        sx={{
          backgroundColor: "#16a34a",
          "&:hover": { backgroundColor: "#15803d" },
          mb: 2,
          mt: 2,
        }}
        onClick={handleAddUser}
      >
        + Add User
      </Button>

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
            <TableRow sx={{ background: "linear-gradient(to right, #00332b, #004d40)" }}>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>USERNAME</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>BALANCE</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, i) => (
                <TableRow
                  key={user.id}
                  hover
                  sx={{
                    backgroundColor: i % 2 === 0 ? "#f9f9f9" : "#ffffff",
                    "&:hover": { backgroundColor: "#e6f7f3" },
                  }}
                >
                  <TableCell sx={{ color: "#004d80", fontWeight: 500 }}>
                    {user.username}
                  </TableCell>
                  <TableCell sx={{ color: "#000" }}>
                    ₹{parseFloat(user.balance).toFixed(2)}
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
            minWidth: 160,
            paddingY: 0.5,
          },
        }}
      >
        <MenuItem onClick={handleDeposit}>Deposit</MenuItem>
        <MenuItem onClick={handleWithdraw}>Withdraw</MenuItem>
        <MenuItem onClick={handleResetPassword}>Reset Password</MenuItem>
        <MenuItem onClick={handleStatement}>Statement</MenuItem>
        <MenuItem onClick={handleEditProfile}>Edit Profile</MenuItem>
      </Menu>
    </Box>
  );
}

export default Usermanagement;
