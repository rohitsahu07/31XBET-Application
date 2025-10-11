import React from "react";
import { Box, Grid, Typography, Button } from "@mui/material";
import { keyframes } from "@mui/system";
import { useNavigate } from "react-router-dom"; // ✅ for navigation

// Animation for continuous scrolling text
const scroll = keyframes`
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
`;

function Casino() {

const navigate = useNavigate();

  return (
    <div>
      {/* Scrolling Text Bar */}
      <Box
        sx={{
          width: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          bgcolor: "#47ff00", // background color
          color: "white !important",
          mt: 1,
        }}
      >
        <Typography
          component="div"
          sx={{
            display: "inline-block",
            px: 2,
            animation: `${scroll} 20s linear infinite`,
            fontWeight: 500,
            fontSize: { xs: "12px", sm: "16px" },
            "&:hover": {
              animationPlayState: "paused", // pause when hovered
            },
          }}
        >
          🚀 Ground commentary ki bet delete hongi har match m..Kalyan, Gali, Disawer Matka chalu h
        </Typography>
      </Box>
      {/* Live Casino Header */}
      <Box
        sx={{
          bgcolor: "#e30909",
          color: "#fff",
          textAlign: "center",
          mt: 2,
          mx: 2,
          borderRadius: "2px",
          fontWeight: 400,
          fontSize: "16px",
        }}
      >
        Live Casino
      </Box>

      {/* Game Images Grid */}
      <Grid
        container
        spacing={4}
        justifyContent="center"
        sx={{ mt: 1, px: 2 }}
      >
        {[
          { src: "frontend_assets/Casino_images/casino_img1.jpg" },
          { src: "frontend_assets/Casino_images/casino_img2.jpg", onClick: () => navigate("/teen-play") },
          { src: "frontend_assets/Casino_images/casino_img3.jpg" },
          { src: "frontend_assets/Casino_images/casino_img4.jpg"},
          { src: "frontend_assets/Casino_images/casino_img5.jpg" },
          { src: "frontend_assets/Casino_images/casino_img6.png" },
        ].map((game, index) => (
          <Grid
            item
            key={index}
            xs={6}
            md={2}
            sx={{ textAlign: "center" }}
          >
            <a href={game.link} style={{ textDecoration: "none" }}>
              <Box
                component="img"
                src={game.src}
                alt="game"
                sx={{
                  width:{ xs: "120px", sm: "170px" },
                  height: "90px",
                  borderRadius: 1,
                  mb: 1,
                  boxShadow: 2,
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.05)" },
                  cursor: "pointer"
                }}
                onClick={game.onClick}
                
              />
            </a>
          </Grid>
        ))}
      </Grid>

      {/* Back to Main Menu Button */}
      <Box
        sx={{
          textAlign: "center",
          mt: 3,
        }}
      >
        <Button
          variant="contained"
          className="main-menu-btn"
          sx={{
            color: "white",
            fontWeight: "bold",
            px: 4,
            py: 1,
            borderRadius: "4px"
          }}
          onClick={() => {
                navigate("/home");
            }}
        >
          BACK TO MAIN MENU
        </Button>
      </Box>
    </div>
  );
}

export default Casino;
