import React from "react";
import { Box, Grid, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import SectionHeader from "./common_components/PageTitle";

function Casino() {
  const navigate = useNavigate();

  const games = [
    { src: "frontend_assets/Casino_images/casino_img1.jpg", title: "Andar Bahar" },
    { src: "frontend_assets/Casino_images/casino_img2.jpg", title: "3 Patti", onClick: () => navigate("/teen-play") },
    { src: "frontend_assets/Casino_images/casino_img3.jpg", title: "Dragon Tiger" },
    { src: "frontend_assets/Casino_images/casino_img4.jpg", title: "Teen Patti 1 Day" },
    { src: "frontend_assets/Casino_images/casino_img5.jpg", title: "Lucky 7" },
    { src: "frontend_assets/Casino_images/casino_img6.png", title: "Aviator" },
  ];

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 3,
      }}
    >
      {/* Header inside same Container for equal padding */}
      <Box sx={{ mb: 3 }}>
        <SectionHeader title="Live Casino" />
      </Box>

      {/* Games Grid */}
      <Grid
        container
        spacing={{ xs: 2, sm: 3, md: 4 }}
        justifyContent="flex-start"
        alignItems="center"
      >
        {games.map((game, index) => (
          <Grid
            item
            key={index}
            xs={6}
            sm={4}
            md={2}
            sx={{
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box
              component="img"
              src={game.src}
              alt={game.title}
              sx={{
                width: { xs: "120px", sm: "160px", md: "180px" },
                height: { xs: "90px", sm: "110px", md: "120px" },
                borderRadius: "8px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                "&:hover": {
                  transform: "scale(1.07)",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
                },
                cursor: "pointer",
              }}
              onClick={game.onClick}
            />
          </Grid>
        ))}
      </Grid>

      {/* Back Button */}
      <Box sx={{ textAlign: "center", mt: 5 }}>
        <BackToMainMenuButton />
      </Box>
    </Container>
  );
}

export default Casino;
