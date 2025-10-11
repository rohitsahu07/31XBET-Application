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
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import SectionHeader from "./common_components/PageTitle";

const Profile = () => {
  const [profile, setProfile] = useState({});
  const [rateDifference, setRateDifference] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get("/api/profile/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data || {});
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.put(
        "/api/profile/update_rate/",
        { rate_difference: rateDifference },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Rate Difference updated successfully");
    } catch (err) {
      console.error("Error updating rate difference:", err);
      alert("Failed to update rate difference");
    }
  };

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


      {/* ================== PERSONAL INFORMATION ================== */}
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
                Client Name :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                {profile.client_name || "—"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...cellStyle, fontWeight: "bold" }}>
                Client Code :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                {profile.client_code || "—"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...cellStyle, fontWeight: "bold" }}>
                Chips :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                {profile.chips ?? "0"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...cellStyle, fontWeight: "bold" }}>
                DOJ :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                {profile.doj || "—"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...cellStyle, fontWeight: "bold" }}>
                Address :
              </TableCell>
              <TableCell sx={{ ...cellStyle, borderRight: "none" }}>
                {profile.address || "—"}
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
