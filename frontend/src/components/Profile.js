import React, { useEffect, useState } from "react";
import axios from "../services/api";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from "@mui/material";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import SectionHeader from "./common_components/PageTitle";

const Profile = () => {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get("/api/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data || {});
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };

    fetchProfile();
  }, []);

  const cellStyle = {
    borderRight: "1px solid #004d40",
    borderBottom: "1px solid #004d40",
    padding: "8px 12px",
  };

  return (
    <Box
      sx={{
        backgroundColor: "#e8e8e8",
        minHeight: "100vh",
        p: 2,
      }}
    >
      <SectionHeader title="MY PROFILE" />

      <TableContainer
        component={Paper}
        sx={{
          mb: 3,
          mt: 1,
          border: "1px solid #004d40",
          boxShadow: "0px 2px 5px rgba(0,0,0,0.15)",
        }}
      >
        <Box
          sx={{
            backgroundColor: "#004d40",
            color: "white",
            fontWeight: "bold",
            px: 2,
            py: 1,
            fontSize: "1rem",
          }}
        >
          PERSONAL INFORMATION
        </Box>

        <Table>
          <TableBody>
            <TableRow>
              <TableCell sx={{ ...cellStyle, fontWeight: "bold" }}>
                Username :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                {profile.username || "—"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...cellStyle, fontWeight: "bold" }}>
                Email :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                {profile.email || "—"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...cellStyle, fontWeight: "bold" }}>
                Balance :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                ₹{parseFloat(profile.balance || 0).toFixed(2)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...cellStyle, fontWeight: "bold" }}>
                Role :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                {profile.role || "User"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ textAlign: "center", mt: 3 }}>
        <BackToMainMenuButton />
      </Box>
    </Box>
  );
};

export default Profile;
