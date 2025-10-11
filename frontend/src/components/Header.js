// frontend/src/components/Header.js
import React from "react";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  MenuItem,
  Menu,
  Divider,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Header() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const navigate = useNavigate();

  const isMenuOpen = Boolean(anchorEl);

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleProfile = () => {
    handleMenuClose();
    navigate("/profile");
  };

  const handleUserManagement = () => {
    handleMenuClose();
    navigate("/user-management");
  };

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      const access = localStorage.getItem("access_token");

      if (!refresh || !access) {
        console.warn("⚠️ No tokens found, redirecting to login...");
        localStorage.clear();
        navigate("/");
        return;
      }

      console.log("🔄 Sending logout request to backend...");

      // ✅ Proper API call with Authorization header
      await api.post(
        "/api/users/logout/",
        { refresh },
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      );

      console.log("✅ Logout successful (backend hit confirmed)");
    } catch (error) {
      console.error("❌ Logout failed:", error.response?.data || error.message);
    } finally {
      // ✅ Clear tokens and redirect to login page
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      navigate("/");
    }
  };

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      id="account-menu"
      keepMounted
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleProfile}>
        <IconButton size="small" color="inherit">
          <PersonIcon />
        </IconButton>
        Profile
      </MenuItem>

      <Divider component="li" />

      <MenuItem onClick={handleUserManagement}>
        <IconButton size="small" color="inherit">
          <AccountCircle />
        </IconButton>
        User Management
      </MenuItem>

      <Divider component="li" />

      <MenuItem onClick={handleLogout}>
        <IconButton size="small" color="inherit">
          <LogoutIcon />
        </IconButton>
        Logout
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" className="header-color">
        <Toolbar>
          {/* Left: Title */}
          <Typography variant="h6" noWrap component="div">
            Welcome
          </Typography>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Menu */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
            <MenuItem sx={{ color: "#fff" }} onClick={() => navigate("/home")}>
              <FaHome size={20} style={{ marginRight: "6px" }} />
              Home
            </MenuItem>

            <MenuItem sx={{ color: "#fff" }} onClick={() => navigate("/rules")}>
              Rules
            </MenuItem>

            <IconButton size="large" color="inherit" onClick={handleProfileMenuOpen}>
              <AccountCircle />
            </IconButton>
          </Box>

          {/* Mobile View: Only Profile Icon */}
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton size="large" color="inherit" onClick={handleProfileMenuOpen}>
              <AccountCircle />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {renderMenu}
    </Box>
  );
}

export default Header;
