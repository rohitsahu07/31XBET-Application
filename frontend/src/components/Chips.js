import { Box, Typography } from "@mui/material";
import { FaPlay } from "react-icons/fa";

const HalfChip = ({ label, type }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: type === "play" ? "center" : "flex-end",
      bgcolor: "grey.600",
      borderRadius: "6px",
      width: type === "play" ? 20 : 40,
      height: 20,
      position: "relative",
      overflow: "hidden",
      paddingRight:  type === "play" ? "0" : "5px"
    }}
  >
    {/* If type is "half", show left green overlay */}
    {type === "half" && (
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "50%",
          bgcolor: "green",
        }}
      />
    )}

    {/* Label or Play icon */}
    {type === "play" ? (
      <FaPlay style={{ color: "dodgerblue", fontSize: "10px", zIndex: 1 }} />
    ) : (
      <Typography
        variant="body2"
        sx={{
          color: "white",
          fontWeight: "bold",
          zIndex: 1,
        }}
      >
        {label}
      </Typography>
    )}
  </Box>
);

export default function Chips() {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      {/* First: full grey with play button */}
      <HalfChip type="play" />

      {/* Others: grey + half green + letter */}
      <HalfChip label="F" type="half" />
      <HalfChip label="B" type="half" />
    </Box>
  );
}
