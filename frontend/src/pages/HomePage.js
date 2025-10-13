import React from "react";
import { Link } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";

const menuItems = [
  { icon: "frontend_assets/Casino.png", path: "/casino" },
  { icon: "frontend_assets/Profile.png", path: "/profile" },
  { icon: "frontend_assets/Statement.png", path: "/statement" },
  { icon: "frontend_assets/Rules.png", path: "/rules" },
  { icon: "frontend_assets/My_Ledger.png", path: "/ledger" },
  { icon: "frontend_assets/Password.png", path: "/password" },
];

const Item = styled("div")(() => ({
  textAlign: "center",
}));

const HomePage = () => {
  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mt: 0
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, // 👈 2 on mobile, 4 on desktop
          gap: 2, // spacing between items
          maxWidth: "900px",
          width: "100%",
        }}
      >
        {menuItems.map((item, index) => (
          <Item key={index}>
            <Link
              to={item.path}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <img
                src={item.icon}
                alt={`menu-${index}`}
                style={{
                  width: "180px", // bigger images
                  height: "180px",
                  objectFit: "contain",
                }}
              />
            </Link>
          </Item>
        ))}
      </Box>
    </Box>
  );
};

export default HomePage;
