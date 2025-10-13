import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import axios from "../services/api";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("New and Confirm password must match!");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res = await axios.post(
        "/api/users/change-password/",
        {
          old_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          },
        }
      );
      setMessage(res.data.detail || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage(
        err.response?.data?.detail || "Failed to change password. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "#f4f4f4",
        minHeight: "100vh",
        display: "flex",
        alignItems: "start",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: 380,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: "bold", color: "#004d40", mb: 3 }}
        >
          Change Password
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Current Password"
            type="password"
            fullWidth
            margin="normal"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <TextField
            label="Confirm Password"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {message && (
            <Typography
              sx={{
                mt: 2,
                color: message.includes("successfully") ? "green" : "red",
                fontSize: "0.9rem",
              }}
            >
              {message}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            color="success"
            fullWidth
            sx={{
              mt: 3,
              py: 1.2,
              fontWeight: "bold",
              borderRadius: 2,
            }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "CHANGE PASSWORD"
            )}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ChangePassword;
