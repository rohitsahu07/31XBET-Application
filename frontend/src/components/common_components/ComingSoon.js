// src/pages/ComingSoonFancy.jsx
import * as React from "react";
import {
  Box,
  Button,
  Container,
  GlobalStyles,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

/**
 * Props:
 * - imageSrc: path to your illustration (public/ or imported from src/assets)
 * - title: main title (default "Coming Soon")
 * - subtitle: small caption line
 * - backTo: route to navigate on button click (default "/home")
 */
export default function ComingSoonFancy({
  imageSrc = "/frontend_assets/coming_soon_img.png",
  title = "Coming Soon",
  subtitle = "We’re currently working hard on this page!",
  backTo = "/home",
}) {
  const navigate = useNavigate();

  const pageBg =
    `radial-gradient(900px 600px at 10% 10%, rgba(255,140,199,0.35), transparent 40%),
     radial-gradient(800px 500px at 90% 0%, rgba(255,190,120,0.35), transparent 45%),
     radial-gradient(1000px 700px at 10% 100%, rgba(120,150,255,0.35), transparent 42%),
     linear-gradient(135deg, #4b2f9b 0%, #7d3ee9 35%, #f16ea3 100%)`;

  const cardShadow =
    "0 20px 60px rgba(17, 24, 39, 0.18), 0 2px 8px rgba(17, 24, 39, 0.06)";

  return (
    <>
      {/* Full-page gradient background */}
      <GlobalStyles
        styles={{
          "html, body, #root": { height: "100%" },
          body: { margin: 0, background: pageBg, backgroundAttachment: "fixed" },
        }}
      />

      <Box
        sx={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          p: { xs: 2, sm: 4 },
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 3,
              boxShadow: cardShadow,
              p: { xs: 3, sm: 5 },
              textAlign: "center",
            }}
          >
            {/* Simple image (no SVG/clip) */}
            <Box
              sx={{
                width: "min(460px, 70%)",
                mx: "auto",
                mb: { xs: 3, sm: 4 },
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <Box
                component="img"
                src={imageSrc}
                alt="Coming soon illustration"
                sx={{ width: "100%", height: "auto", display: "block" }}
              />
            </Box>

            {/* Text content */}
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, letterSpacing: 0.2, mb: 1 }}
            >
              {title}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 520, mx: "auto", mb: 3 }}
            >
              {subtitle}
            </Typography>

            <Button
              onClick={() => navigate(backTo)}
              sx={{
                px: 3,
                py: 1.1,
                fontWeight: 700,
                borderRadius: 3,
                color: "#fff",
                textTransform: "none",
                boxShadow:
                  "0 10px 25px rgba(244, 63, 94, 0.35), 0 2px 6px rgba(244,63,94,0.2)",
                background:
                  "linear-gradient(180deg, #ff7aa2 0%, #ff4d6d 60%, #ff355d 100%)",
                "&:hover": {
                  boxShadow:
                    "0 12px 28px rgba(244, 63, 94, 0.45), 0 3px 8px rgba(244,63,94,0.25)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              BACK TO HOME
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}
