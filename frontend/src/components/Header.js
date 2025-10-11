// src/components/Header.js
import React from "react";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  MenuItem,
  Menu,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import MoreIcon from "@mui/icons-material/MoreVert";
import { useNavigate } from "react-router-dom"; // ✅ for navigation
import { FaHome } from "react-icons/fa";
import axios from "axios";
import LogoutIcon from '@mui/icons-material/Logout';
import Divider from '@mui/material/Divider';


function PrimaryAppBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState(null);
  const navigate = useNavigate();

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  // Menu Handlers
  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMobileMenuOpen = (event) =>
    setMobileMoreAnchorEl(event.currentTarget);
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMoreAnchorEl(null);
  };
  const handleUserManagement = () => {
    navigate("/user-management");
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('refresh_token');  // Assuming refresh_token is stored
    try {
      await axios.post('/api/users/logout/', { refresh: token }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      localStorage.clear();
      navigate('/');
    } catch (err) {
      console.error('Logout failed', err);
      localStorage.clear();
      navigate('/');
    }
  };

  // --- Profile Menu (Desktop)
  const menuId = "primary-account-menu";
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      id={menuId}
      keepMounted
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem
        onClick={() => {
          handleMenuClose();
        }}
      >
        <IconButton size="small" color="inherit">
          <AccountCircle />
        </IconButton>
        My Profile
      </MenuItem>
      <Divider component="li" />
      <MenuItem onClick={handleUserManagement}>
        <IconButton size="small" color="inherit">
          <AccountCircle />
        </IconButton>
        <p>User Management</p>
      </MenuItem>
      <Divider component="li" />
      <MenuItem
        variant="contained"
        color="secondary"
        onClick={handleLogout}
      >
        <IconButton size="small" color="inherit" >
          <LogoutIcon />
        </IconButton>
        Logout
      </MenuItem>
    </Menu>
  );

  // --- Mobile Menu (When screen < md)
  const mobileMenuId = "primary-account-menu-mobile";
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      open={isMobileMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleProfileMenuOpen}>
        <IconButton size="small" color="inherit">
          <AccountCircle />
        </IconButton>
        <p>My Profile</p>
      </MenuItem>
      <Divider component="li" />
      <MenuItem
        variant="contained"
        color="secondary"
        onClick={handleLogout}
      >
        <IconButton size="small" color="inherit" >
          <LogoutIcon />
        </IconButton>
        <p>Logout</p>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1 }} >
      <AppBar position="static" className="header-color">
        <Toolbar>
          {/* Left Side: Menu Icon + Title */}
          <IconButton size="large" edge="start" color="inherit" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
           Welcome 
          </Typography>

          {/* Spacer pushes right-side icons */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Right-Side (Profile only, since Home/Rules are inside menu) */}
          <Box sx={{ display: { xs: "none", md: "flex" } }}>
            <MenuItem
               sx={{ color: "#fff" }}
              onClick={() => {
                navigate("/home");
              }}
            >
              <FaHome size={20} style={{ paddingRight: "2px", fontSize: "32px" }} />
              Home
            </MenuItem>
            <MenuItem
               sx={{ color: "#fff" }}
              onClick={() => {
                navigate("/rules");
              }}
            >
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

          {/* Mobile Right-Side (3-dots menu) */}
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

// ✅ Export Header
const Header = () => (
 

  <Box>
    <PrimaryAppBar />
  </Box>
);

export default Header;
