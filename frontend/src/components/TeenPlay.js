import React, { useEffect, useState } from "react";
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
import axios from "../services/api";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import CountdownTimer from "./common_components/CountdownTimer";

function TeenPlay() {
  // ==============================
  // STATE VARIABLES
  // ==============================
  const [roundData, setRoundData] = useState({});
  const [timerPhase, setTimerPhase] = useState("long");
  const [lastResults, setLastResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [amount, setAmount] = useState("");
  const [matchBets, setMatchBets] = useState([]);

  // ==============================
  // FETCH GAME DATA EVERY SECOND
  // ==============================
  useEffect(() => {
    const fetchRoundData = async () => {
      try {
        const res = await axios.get("/api/bets/current-round/");
        setRoundData(res.data);
        setLastResults((prev) => {
          const newResult = res.data.result;
          if (newResult && newResult !== prev[prev.length - 1]) {
            const updated = [...prev, newResult].slice(-10);
            return updated;
          }
          return prev;
        });
      } catch (err) {
        console.error("Error fetching game round:", err);
      }
    };

    fetchRoundData();
    const interval = setInterval(fetchRoundData, 1000);
    return () => clearInterval(interval);
  }, []);

  // ==============================
  // HANDLE BET SUBMISSION
  // ==============================
  const handlePlaceBet = async () => {
    if (!selectedPlayer || !amount) {
      alert("Please select a player and enter amount!");
      return;
    }

    try {
      await axios.post("/api/place-bet/", {
        round_id: roundData.round_id,
        player: selectedPlayer,
        amount: parseFloat(amount),
      });

      setMatchBets((prev) => [
        ...prev,
        {
          team: selectedPlayer === "A" ? "Player A" : "Player B",
          rate: "0.96",
          amount,
          mode: "Back",
        },
      ]);

      setAmount("");
      setSelectedPlayer(null);
      alert("✅ Bet placed successfully!");
    } catch (err) {
      console.error("Error placing bet:", err);
      alert("❌ Failed to place bet. Try again!");
    }
  };

  // ==============================
  // STYLES
  // ==============================
  const backButtonStyle = (isSelected) => ({
    bgcolor: isSelected ? "#0288d1" : "#64b5f6",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    "&:hover": { bgcolor: "#42a5f5" },
    transition: "0.2s",
  });

  // ==============================
  // RENDER COMPONENT
  // ==============================
  return (
    <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
      {/* HEADER */}
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
          Round ID: <b>{roundData.round_id || "Loading..."}</b>
        </Typography>
      </Box>

      {/* GAME AREA */}
      <Box
        sx={{
          position: "relative",
          bgcolor: "black",
          height: 400,
          overflow: "hidden",
        }}
      >
        {/* PLAYER & TIMER SECTION */}
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
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Player A
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
              {(
                roundData.player_a_cards || [
                  "flipped_card",
                  "flipped_card",
                  "flipped_card",
                ]
              ).map((card, i) => (
                <img
                  key={i}
                  src={`frontend_assets/Cards_images/${card}.png`}
                  alt="Card"
                  width="45"
                />
              ))}
            </Box>
          </Box>

          {/* TIMER */}
          <CountdownTimer onPhaseChange={(phase) => setTimerPhase(phase)} />

          {/* Player B */}
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Player B
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
              {(
                roundData.player_b_cards || [
                  "flipped_card",
                  "flipped_card",
                  "flipped_card",
                ]
              ).map((card, i) => (
                <img
                  key={i}
                  src={`frontend_assets/Cards_images/${card}.png`}
                  alt="Card"
                  width="45"
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* PLAYER ODDS SECTION (Now Clickable) */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#b0b0b0" }}>
              <TableCell
                align="center"
                sx={{
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
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Back
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {["A", "B"].map((player) => (
              <TableRow
                key={player}
                sx={{
                  bgcolor: selectedPlayer === player ? "#9e9e9e" : "#bfbfbf",
                }}
              >
                <TableCell
                  align="center"
                  sx={{
                    color: "white",
                    fontWeight: 600,
                    borderRight: "1px solid white",
                  }}
                >
                  Player {player}
                </TableCell>
                <TableCell
                  align="center"
                  sx={backButtonStyle(selectedPlayer === player)}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <Typography sx={{ lineHeight: 1 }}>0.96</Typography>
                  <Typography sx={{ lineHeight: 1 }}>0</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* LAST RESULT */}
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

      {/* AMOUNT INPUT + DONE */}
      <Box sx={{ bgcolor: "#efebebff", py: 2, px: 2 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Typography>Amount</Typography>
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              type="number"
              size="small"
              fullWidth
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color={timerPhase === "short" ? "error" : "success"}
              fullWidth
              onClick={handlePlaceBet}
              disabled={!selectedPlayer || !amount || timerPhase === "short"}
            >
              {timerPhase === "short" ? "BET CLOSED" : "PLACE BET"}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* MATCH BETS TABLE */}
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
