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
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import MoreIcon from "@mui/icons-material/MoreVert";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // ✅ centralized axios instance

function PrimaryAppBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState(null);
  const navigate = useNavigate();

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  // -----------------------------
  // Menu Handlers
  // -----------------------------
  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMobileMenuOpen = (event) => setMobileMoreAnchorEl(event.currentTarget);
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMoreAnchorEl(null);
  };

  // -----------------------------
  // Navigation Actions
  // -----------------------------
  const handleProfile = () => {
    handleMenuClose();
    navigate("/profile");
  };

  const handleUserManagement = () => {
    handleMenuClose();
    navigate("/user-management");
  };

  // -----------------------------
  // Logout Handler (Full Backend Integration)
  // -----------------------------
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

  // -----------------------------
  // Desktop Menu
  // -----------------------------
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      id="primary-account-menu"
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

  // -----------------------------
  // Mobile Menu
  // -----------------------------
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      id="primary-account-menu-mobile"
      keepMounted
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      open={isMobileMenuOpen}
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

  // -----------------------------
  // Render Header Bar
  // -----------------------------
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" className="header-color">
        <Toolbar>
          {/* Left side - Menu + Title */}
          <IconButton size="large" edge="start" color="inherit" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div">
            Welcome
          </Typography>

          {/* Spacer pushes items right */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: "none", md: "flex" } }}>
            <MenuItem sx={{ color: "#fff" }} onClick={() => navigate("/home")}>
              <FaHome size={22} style={{ marginRight: "6px" }} />
              Home
            </MenuItem>

            <MenuItem sx={{ color: "#fff" }} onClick={() => navigate("/rules")}>
              Rules
            </MenuItem>

            <IconButton
              size="large"
              edge="end"
              color="inherit"
              onClick={handleProfileMenuOpen}
            >
              <AccountCircle />
            </IconButton>
          </Box>

          {/* Mobile Navigation */}
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              color="inherit"
              onClick={handleMobileMenuOpen}
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Menus */}
      {renderMobileMenu}
      {renderMenu}
    </Box>
  );
}

// -----------------------------
// Export Header Component
// -----------------------------
const Header = () => (
  <Box>
    <PrimaryAppBar />
  </Box>
);

export default Header;
