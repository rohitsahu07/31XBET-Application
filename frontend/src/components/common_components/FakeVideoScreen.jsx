// frontend/src/components/common_components/FakeVideoScreen.jsx
import * as React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";

/* -------------------- Loading ring (your original) -------------------- */
const LoadingRing = ({ size = 72, thickness = 5 }) => (
  <Box sx={{ position: "relative", width: size, height: size }}>
    {/* Track */}
    <CircularProgress
      variant="determinate"
      value={100}
      size={size}
      thickness={thickness}
      sx={{ color: "rgba(33, 150, 243, 0.18)" }}
    />
    {/* Spinning arc */}
    <CircularProgress
      variant="indeterminate"
      disableShrink
      size={size}
      thickness={thickness}
      sx={{
        color: "#1976d2",
        position: "absolute",
        left: 0,
        top: 0,
        "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
      }}
    />
  </Box>
);

/* -------------------- Simple titles only (no descriptions) -------------------- */
const ERROR_TITLES = [
  "Can’t play this video!!",
  "Video not available!",
  "Slow or no internet!",
  "Format not supported!",
  "Autoplay blocked!",
  "Access required!!",
  "Region restricted!",
  "Secure playback failed!",
  "Server is busy!!",
  "Unauthorised!",
];

/**
 * Alternates every cycleMs between:
 *  - 10s loader
 *  - 10s a random single-line error title
 */
export default function FakeVideoScreen({
  cycleMs = 20000,                 // 10s per phase
  height = { xs: 260, sm: 400 },   // match your existing layout
  width = "100%",
  titles = ERROR_TITLES,           // override if you want custom titles
  centered = false,                // set true to center the text
}) {
  const [phase, setPhase] = React.useState("loading"); // "loading" | "error"
  const [idx, setIdx] = React.useState(0);
  const lastIdxRef = React.useRef(-1);

  const pickRandomIndex = React.useCallback(() => {
    if (titles.length <= 1) return 0;
    let i = Math.floor(Math.random() * titles.length);
    if (i === lastIdxRef.current) i = (i + 1) % titles.length; // avoid repeats
    lastIdxRef.current = i;
    return i;
  }, [titles]);

  React.useEffect(() => {
    // Preselect an error for the first error phase
    setIdx(pickRandomIndex());
    const id = setInterval(() => {
      setPhase((prev) => {
        const next = prev === "loading" ? "error" : "loading";
        if (next === "error") setIdx(pickRandomIndex());
        return next;
      });
    }, cycleMs);
    return () => clearInterval(id);
  }, [cycleMs, pickRandomIndex]);

  return (
    <Box
      sx={{
        bgcolor: "black",
        height,
        width,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        p: 2,
      }}
    >
      {phase === "loading" ? (
        <LoadingRing size={50} thickness={2} />
      ) : (
        <Box
          role="status"
          sx={{
            maxWidth: 560,
            width: "100%",
            textAlign: "center",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: "#eee",
              fontWeight: 500,
              letterSpacing: 0.2,
              textShadow: "0 1px 3px rgba(0,0,0,0.6)", // subtle readability on black
              userSelect: "none",
              justifyContent: "center"
            }}
          >
            {titles[idx]}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
