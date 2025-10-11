// frontend/src/components/TeenPlay.jsx
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
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import CountdownTimer from "./common_components/CountdownTimer";
import axios from "../services/api";

function TeenPlay() {
  // -----------------------------
  // State
  // -----------------------------
  const [lastResults, setLastResults] = useState(["B", "B", "A", "A", "B", "A"]);
  const [matchBets, setMatchBets] = useState([]);
  const [oddsData, setOddsData] = useState([
    { player: "Player A", rate: "0.96" },
    { player: "Player B", rate: "0.96" },
  ]);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedBackType, setSelectedBackType] = useState("Back");
  const [amount, setAmount] = useState("");
  const [timerPhase, setTimerPhase] = useState("long");
  const [roundData, setRoundData] = useState({});
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // Fetch Current Round (every 1s)
  // -----------------------------
  useEffect(() => {
    const fetchRound = async () => {
      try {
        const res = await axios.get("/api/bets/current-round/");
        setRoundData(res.data);
      } catch (err) {
        console.error("Error fetching round:", err);
      }
    };

    fetchRound();
    const interval = setInterval(fetchRound, 1000);
    return () => clearInterval(interval);
  }, []);

  // -----------------------------
  // Handle Bet Placement
  // -----------------------------
  const handlePlaceBet = async () => {
    if (!selectedPlayer) {
      alert("Please select a player!");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Enter a valid amount!");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/bets/place-bet/", {
        player: selectedPlayer === "Player A" ? "A" : "B",
        amount: parseFloat(amount),
        back: selectedBackType,
      });

      alert(res.data.message);
      setMatchBets((prev) => [
        ...prev,
        {
          team: selectedPlayer,
          rate: "0.96",
          amount,
          mode: selectedBackType,
        },
      ]);
      setAmount("");
      setSelectedPlayer(null);
    } catch (err) {
      console.error("Bet placement error:", err);
      alert(
        err.response?.data?.error ||
          "Something went wrong placing your bet."
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // JSX
  // -----------------------------
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
          Round ID: <b>{roundData?.round_id || "Loading..."}</b>
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
        {/* Loading Indicator */}
        {!roundData.round_id && (
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
        )}

        {/* Player Cards */}
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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              border:
                selectedPlayer === "Player A"
                  ? "2px solid #4caf50"
                  : "2px solid transparent",
              borderRadius: "8px",
              p: 1,
            }}
            onClick={() => setSelectedPlayer("Player A")}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Player A
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <img
                src="frontend_assets/Cards_images/flipped_card.png"
                alt="Card"
                width="45"
              />
              <img
                src="frontend_assets/Cards_images/flipped_card.png"
                alt="Card"
                width="45"
              />
              <img
                src="frontend_assets/Cards_images/flipped_card.png"
                alt="Card"
                width="45"
              />
            </Box>
          </Box>

          {/* TIMER */}
          <CountdownTimer onPhaseChange={(phase) => setTimerPhase(phase)} />

          {/* Player B */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              border:
                selectedPlayer === "Player B"
                  ? "2px solid #4caf50"
                  : "2px solid transparent",
              borderRadius: "8px",
              p: 1,
            }}
            onClick={() => setSelectedPlayer("Player B")}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Player B
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <img
                src="frontend_assets/Cards_images/flipped_card.png"
                alt="Card"
                width="45"
              />
              <img
                src="frontend_assets/Cards_images/flipped_card.png"
                alt="Card"
                width="45"
              />
              <img
                src="frontend_assets/Cards_images/flipped_card.png"
                alt="Card"
                width="45"
              />
            </Box>
          </Box>
        </Box>
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color={timerPhase === "short" ? "error" : "success"}
              id="cmdDone"
              fullWidth
              onClick={handlePlaceBet}
              disabled={
                !selectedPlayer || !amount || timerPhase === "short" || loading
              }
            >
              {timerPhase === "short" ? "BET CLOSED" : loading ? "..." : "DONE"}
            </Button>
          </Grid>
        </Grid>

        {/* Back/Lay Buttons */}
        <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
          <Button
            variant={
              selectedBackType === "Back" ? "contained" : "outlined"
            }
            color="success"
            onClick={() => setSelectedBackType("Back")}
          >
            Back
          </Button>
          <Button
            variant={selectedBackType === "Lay" ? "contained" : "outlined"}
            color="error"
            onClick={() => setSelectedBackType("Lay")}
          >
            Lay
          </Button>
        </Box>
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
