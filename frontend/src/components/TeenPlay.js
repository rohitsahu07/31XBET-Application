import React from "react";
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import CountdownTimer from "./common_components/CountdownTimer";

function TeenPlay() {
  // -----------------------------
  // Mock Data
  // -----------------------------
  const lastResults = ["B", "B", "B", "A", "A", "B", "A", "B", "A", "A"];
  const matchBets = []; // Future data for bets

  const oddsData = [
    { player: "Player A", rate: "0.96", amount: "0" },
    { player: "Player B", rate: "0.96", amount: "0" },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1200,
        mx: "auto",
      }}
    >
      {/* ========================== */}
      {/* HEADER */}
      {/* ========================== */}
      <Box
        sx={{
          background: "linear-gradient(to right, #004d40, #00796b)",
          color: "white",
          px: 2,
          py: 1,
          mt: 1,
          borderRadius: "6px 6px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Teen Patti 20-20
        </Typography>
        <Typography variant="subtitle2">
          Round ID: <b>102251011230943</b>
        </Typography>
      </Box>

      {/* ========================== */}
      {/* GAME DISPLAY AREA */}
      {/* ========================== */}
      <Box
        sx={{
          position: "relative",
          bgcolor: "black",
          height: 400,
          overflow: "hidden",
        }}
      >
        {/* Center Loading Indicator */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Box
            sx={{
              border: "4px solid rgba(255, 255, 255, 0.2)",
              borderTop: "4px solid white",
              borderRadius: "50%",
              width: 40,
              height: 40,
              animation: "spin 1s linear infinite",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          />
        </Box>

        {/* Player Cards with Timer */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            bgcolor: "#222",
            color: "white",
            p: 1.5,
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {/* Player A */}
          <Box sx={{ display: "flex", flexDirection:"column", alignItems: "center", gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Player A
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <img src="frontend_assets/Cards_images/flipped_card.png" alt="Card" width="45" />
              <img src="frontend_assets/Cards_images/flipped_card.png" alt="Card" width="45" />
              <img src="frontend_assets/Cards_images/flipped_card.png" alt="Card" width="45" />
            </Box>
          </Box>

          {/* TIMER IN CENTER */}
          <CountdownTimer />

          {/* Player B */}
          <Box sx={{ display: "flex", flexDirection:"column", alignItems: "center", gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Player B
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <img src="frontend_assets/Cards_images/flipped_card.png" alt="Card" width="45" />
              <img src="frontend_assets/Cards_images/flipped_card.png" alt="Card" width="45" />
              <img src="frontend_assets/Cards_images/flipped_card.png" alt="Card" width="45" />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ========================== */}
      {/* PLAYER ODDS SECTION (Refined) */}
      {/* ========================== */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#b0b0b0" }}>
              <TableCell
                align="center"
                sx={{
                  width: "70%",
                  color: "white",
                  fontWeight: "bold",
                  borderRight: "1px solid white",
                }}
              >
                Players
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  bgcolor: "#64b5f6",
                  width: "30%",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Back
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {oddsData.map((row, index) => (
              <TableRow
                key={index}
                sx={{
                  "&:nth-of-type(even)": { bgcolor: "#bfbfbf" },
                  "&:nth-of-type(odd)": { bgcolor: "#b0b0b0" },
                }}
              >
                {/* Player Column */}
                <TableCell
                  align="center"
                  sx={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: { xs: "0.9rem", md: "1rem" },
                    borderRight: "1px solid white",
                  }}
                >
                  {row.player} (0)
                </TableCell>

                {/* Rate & Amount Column */}
                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#64b5f6",
                    color: "white",
                    fontWeight: 500,
                    fontSize: { xs: "0.9rem", md: "1rem" },
                  }}
                >
                  <Typography sx={{ lineHeight: 1 }}>{row.rate}</Typography>
                  <Typography sx={{ lineHeight: 1 }}>{row.amount}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ========================== */}
      {/* LAST RESULT SECTION */}
      {/* ========================== */}
      <Box sx={{ bgcolor: "#004d40", color: "white", p: 1 }}>
        <Typography sx={{ fontWeight: 600 }}>Last Result</Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          bgcolor: "#e0e0e0",
          p: 1,
        }}
      >
        {lastResults.map((res, i) => (
          <Box
            key={i}
            sx={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              bgcolor: res === "A" ? "green" : "red",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: 0.5,
            }}
          >
            {res}
          </Box>
        ))}
      </Box>

      {/* ========================== */}
      {/* BET ENTRY SECTION */}
      {/* ========================== */}
      <Box sx={{ bgcolor: "#efebebff", py: 2, px: 2 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Typography>Amount</Typography>
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              id="MatchAmount"
              type="number"
              size="small"
              fullWidth
              placeholder="Enter amount"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="success"
              id="cmdDone"
              fullWidth
              disabled
            >
              DONE
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* ========================== */}
      {/* MATCH BETS TABLE */}
      {/* ========================== */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={4}
                sx={{
                  backgroundColor: "#d9d9d9",
                  textAlign: "center",
                  fontWeight: "bold",
                  color: "black",
                }}
              >
                MATCH BETS
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>TEAM</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>RATE</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>AMOUNT</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>MODE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matchBets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No bets
                </TableCell>
              </TableRow>
            ) : (
              matchBets.map((bet, i) => (
                <TableRow key={i}>
                  <TableCell>{bet.team}</TableCell>
                  <TableCell>{bet.rate}</TableCell>
                  <TableCell>{bet.amount}</TableCell>
                  <TableCell>{bet.mode}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2 }}>
        <BackToMainMenuButton />
      </Box>
    </Box>
  );
}

export default TeenPlay;
