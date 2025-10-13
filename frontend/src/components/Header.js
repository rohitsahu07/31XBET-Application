// frontend/src/components/Header.js
import React, { useEffect, useState } from "react";
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
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Header() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isMenuOpen = Boolean(anchorEl);
  const navigate = useNavigate();

  // Prefer /api/users/me/ to determine role
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const access = sessionStorage.getItem("access_token");
        const res = await api.get("/api/users/me/", {
          headers: access ? { Authorization: `Bearer ${access}` } : {},
        });
        if (!mounted) return;
        setIsSuperuser(!!res.data?.is_superuser);
      } catch (e) {
        // optional fallback from cache
        const cached = sessionStorage.getItem("is_admin");
        if (mounted && cached !== null) setIsSuperuser(cached === "1");
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleProfileMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleUserManagement = () => {
    handleMenuClose();
    navigate("/user-management");
  };

  const handleLogout = async () => {
    try {
      const refresh = sessionStorage.getItem("refresh_token");
      const access = sessionStorage.getItem("access_token");
      if (!refresh || !access) throw new Error("No tokens");
      await api.post(
        "/api/users/logout/",
        { refresh },
        { headers: { Authorization: `Bearer ${access}` } }
      );
    } catch (e) {
      // non-blocking fallback
      console.warn("Logout:", e?.message || e);
    } finally {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      navigate("/");
    }
  };

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

          {/* Desktop-only: Home & Rules */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
            <MenuItem sx={{ color: "#fff" }} onClick={() => navigate("/home")}>
              <FaHome size={20} style={{ marginRight: 6 }} />
              Home
            </MenuItem>
            <MenuItem sx={{ color: "#fff" }} onClick={() => navigate("/rules")}>
              Rules
            </MenuItem>
          </Box>

          {/* Always show (both mobile & desktop): role-based icons */}
          {loaded && (
            !isSuperuser ? (
              // Client: Logout only
              <IconButton
                size="large"
                color="inherit"
                onClick={handleLogout}
                aria-label="Logout"
                sx={{ ml: 0.5 }}
              >
                <LogoutIcon />
              </IconButton>
            ) : (
              // Admin: Account menu (User Management + Logout)
              <>
                <IconButton
                  size="large"
                  color="inherit"
                  onClick={handleProfileMenuOpen}
                  aria-label="Account menu"
                  sx={{ ml: 0.5 }}
                >
                  <AccountCircle />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  anchorOrigin={{ vertical: "top", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  open={isMenuOpen}
                  onClose={handleMenuClose}
                  id="account-menu"
                >
                  <MenuItem onClick={handleUserManagement}>
                    <AccountCircle fontSize="small" style={{ marginRight: 8 }} />
                    User Management
                  </MenuItem>
                  <Divider component="li" />
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            )
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}

export default Header;
