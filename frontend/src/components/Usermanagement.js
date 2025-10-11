import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import axios from "../services/api";
import SectionHeader from "./common_components/PageTitle";

const Usermanagement = () => {
  const [users, setUsers] = useState([]);
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openCoinDialog, setOpenCoinDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [formData, setFormData] = useState({ username: "", password: "", initial_balance: "" });
  const [adminBalance, setAdminBalance] = useState(0);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users/");
      const data = res.data;

      // Filter out admin/superusers
      const filteredUsers = data.filter((u) => !u.is_superuser);
      setUsers(filteredUsers);
      const me = res.data.find(
        (u) => u.username === localStorage.getItem("username")
      );
      if (me) setAdminBalance(me.balance);
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      await axios.post("/api/users/", {
        username: formData.username,
        password: formData.password,
        role: "client",
        initial_balance: formData.initial_balance, // ✅ Added
      });
      setOpenAddUser(false);
      setFormData({ username: "", password: "", initial_balance: "" });
      fetchUsers();
    } catch (err) {
      console.error("Error creating user", err);
    }
  };

  const handleGrantCoins = async () => {
    try {
      await axios.post("/api/users/grant_coins/", {
        user_id: selectedUser.id,
        amount,
      });
      setOpenCoinDialog(false);
      setAmount("");
      fetchUsers();
    } catch (err) {
      console.error("Error granting coins", err);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`/api/users/${id}/`);
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user", err);
    }
  };

  return (
    <Box p={3}>
      <SectionHeader title="👥 User Management" />
      <Typography variant="h6" gutterBottom>
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpenAddUser(true)}
        sx={{ mb: 2 }}
      >
        + Add User
      </Button>

      <Paper elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.username}</TableCell>
                <TableCell>₹{u.balance}</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                    onClick={() => {
                      setSelectedUser(u);
                      setOpenCoinDialog(true);
                    }}
                  >
                    Add Coins
                  </Button>
                  {!u.is_superuser && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDeleteUser(u.id)}
                    >
                      Delete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Add User Dialog */}
      <Dialog open={openAddUser} onClose={() => setOpenAddUser(false)}>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <TextField
            label="Initial Coins"
            type="number"
            fullWidth
            margin="normal"
            value={formData.initial_balance}
            onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddUser(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Coins Dialog */}
      <Dialog open={openCoinDialog} onClose={() => setOpenCoinDialog(false)}>
        <DialogTitle>
          Grant Coins to {selectedUser?.username || ""}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Amount"
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCoinDialog(false)}>Cancel</Button>
          <Button onClick={handleGrantCoins} variant="contained">
            Grant
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Usermanagement;
