import React, { useEffect, useMemo, useRef, useState } from "react";
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

// ---------- UI: Card box with text when revealed ----------
const CardBox = ({ revealed, label }) => (
  <Box
    sx={{
      width: 62,
      height: 84,
      borderRadius: "6px",
      bgcolor: revealed ? "#ffffff" : "#1d1f22",
      border: "1px solid rgba(255,255,255,0.25)",
      boxShadow: revealed ? "0 0 6px rgba(255,255,255,0.35)" : "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      px: 0.75,
      textAlign: "center",
    }}
  >
    {revealed ? (
      <Typography variant="caption" sx={{ fontWeight: 700, color: "#111", lineHeight: 1.1 }}>
        {label}
      </Typography>
    ) : null}
  </Box>
);

// ---------- Reveal helpers ----------
const revealMaskForStep = (step, player) => {
  const show = [false, false, false];
  if (player === "A") {
    show[0] = step >= 1;
    show[1] = step >= 3;
    show[2] = step >= 5;
  } else {
    show[0] = step >= 2;
    show[1] = step >= 4;
    show[2] = step >= 6;
  }
  return show;
};

// secondsLeft (10..0) -> step (1..6)
const deriveRevealStep = (secondsLeftReveal) => {
  const elapsed = Math.max(0, 10 - (secondsLeftReveal ?? 10)); // 0..10
  return Math.min(6, Math.max(1, Math.floor((elapsed / 10) * 6) + 1));
};

// ---------- Teen Patti ranking (client-side) ----------
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RVAL = RANKS.reduce((m, r, i) => { m[r] = i + 2; return m; }, {});

const parseRank = (c) => c?.split(" of ")[0];
const parseSuit = (c) => c?.split(" of ")[1];
const valuesDesc = (cards) => cards.map(parseRank).map((r) => RVAL[r]).sort((a,b)=>b-a);

const isSequence = (values) => {
  const v = [...values].sort((a,b)=>a-b);
  if (new Set(v).size !== 3) return [false, []];
  // A-2-3 special
  if (v[0] === 2 && v[1] === 3 && v[2] === 14) return [true, [3,2,1]];
  const ok = (v[0]+1===v[1] && v[1]+1===v[2]);
  return [ok, [...values].sort((a,b)=>b-a)];
};

const handRank = (cards) => {
  const vals = cards.map((c)=>RVAL[parseRank(c)]);
  const suits = cards.map(parseSuit);
  const sortedVals = [...vals].sort((a,b)=>b-a);
  const counts = vals.reduce((m,v)=>{m[v]=(m[v]||0)+1; return m;}, {});
  const isFlush = new Set(suits).size===1;
  const [seq, seqTie] = isSequence(vals);
  if (Object.keys(counts).length===1) return [6,[sortedVals[0]]];          // Trail
  if (isFlush && seq) return [5,seqTie];                                   // Pure sequence
  if (seq) return [4,seqTie];                                              // Sequence
  if (isFlush) return [3,sortedVals];                                      // Color
  if (Object.keys(counts).length===2){                                     // Pair
    const pairVal = +Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||b-a)[0];
    const kicker = Math.max(...vals.filter(v=>v!==pairVal));
    return [2,[pairVal,kicker]];
  }
  return [1,sortedVals];                                                   // High card
};

const compareHands = (a,b) => {
  const ra = handRank(a);
  const rb = handRank(b);
  if (ra[0]!==rb[0]) return ra[0]>rb[0] ? "A" : "B";
  // tie-breakers
  const tA = ra[1], tB = rb[1];
  for (let i=0;i<Math.max(tA.length,tB.length);i++){
    if ((tA[i]||0)!==(tB[i]||0)) return (tA[i]||0)>(tB[i]||0) ? "A":"B";
  }
  return "Tie";
};

function TeenPlay() {
  // Snapshot from backend
  const [serverRound, setServerRound] = useState({
    round_id: null,
    phase: "bet",
    seconds_left: 20,
    result: null,            // "A"/"B" at end of reveal (server)
    player_a_full: null,     // provided during reveal
    player_b_full: null,
  });

  // Local timer state
  const [phase, setPhase] = useState("bet");
  const [secondsLeft, setSecondsLeft] = useState(20);

  const [lastResults, setLastResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [amount, setAmount] = useState("");
  const [matchBets, setMatchBets] = useState([]);

  // Refs to avoid stale closure issues
  const tickRef = useRef(null);
  const roundIdRef = useRef(null);
  const phaseRef = useRef(phase);
  const boundaryFetchInFlight = useRef(false);
  const revealFetchInFlight = useRef(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ---------- initial fetch once ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/bets/current-round/");
        if (!mounted) return;
        applySnapshot(data, true); // align + start clock
      } catch (e) {
        console.error("Initial /current-round/ failed:", e);
      }
    })();
    return () => {
      mounted = false;
      stopLocalClock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- local ticking (no continuous polling) ----------
  const startLocalClock = () => {
    stopLocalClock();
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // boundary from 1 -> 0
        const p = phaseRef.current;
        if (p === "bet") {
          // flip to reveal locally and immediately fetch once to get hands
          setPhase("reveal");
          triggerRevealStartFetch();
          return 10; // will be realigned by snapshot
        } else {
          // reveal finished → fetch once to start next bet round
          triggerBoundaryFetch();
          return prev; // overwritten by snapshot
        }
      });
    }, 1000);
  };

  const stopLocalClock = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // fetch once at reveal start (to get player_a_full / player_b_full)
  const triggerRevealStartFetch = async () => {
    if (revealFetchInFlight.current) return;
    revealFetchInFlight.current = true;
    try {
      const { data } = await axios.get("/api/bets/current-round/");
      applySnapshot(data, true);
    } catch (e) {
      console.error("Reveal-start fetch failed:", e);
      setTimeout(triggerRevealStartFetch, 600);
    } finally {
      revealFetchInFlight.current = false;
    }
  };

  // fetch once when reveal ends (to roll next round)
  const triggerBoundaryFetch = async () => {
    if (boundaryFetchInFlight.current) return;
    boundaryFetchInFlight.current = true;
    try {
      const { data } = await axios.get("/api/bets/current-round/");
      applySnapshot(data, true);
    } catch (e) {
      console.error("Boundary fetch failed:", e);
      setTimeout(triggerBoundaryFetch, 1200);
    } finally {
      boundaryFetchInFlight.current = false;
    }
  };

  // ---------- apply snapshot ----------
  const applySnapshot = (data, resetClock = false) => {
    // round changed → store previous winner if known & clear selection
    if (roundIdRef.current !== data.round_id) {
      if (serverRound.result) {
        setLastResults((prev) => [...prev, serverRound.result].slice(-10));
      }
      roundIdRef.current = data.round_id;
      setSelectedPlayer(null);
    }

    const nextPhase = data.phase || "bet";
    const nextSecs =
      typeof data.seconds_left === "number"
        ? data.seconds_left
        : nextPhase === "reveal"
        ? 10
        : 20;

    setServerRound({
      round_id: data.round_id,
      phase: nextPhase,
      seconds_left: nextSecs,
      result: data.result ?? null,
      player_a_full: data.player_a_full || null,
      player_b_full: data.player_b_full || null,
    });

    setPhase(nextPhase);
    setSecondsLeft(nextSecs);

    if (resetClock) {
      stopLocalClock();
      startLocalClock();
    }
  };

  // ---------- place bet ----------
  const handlePlaceBet = async () => {
    if (!selectedPlayer || !amount) {
      alert("Please select a player and enter amount!");
      return;
    }
    if (phase !== "bet") {
      alert("Bet window closed. Please wait for next round.");
      return;
    }
    try {
      await axios.post("/api/bets/place-bet/", {
        round_id: serverRound.round_id,
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

  // ---------- reveal state ----------
  const revealStep = useMemo(() => {
    if (phase !== "reveal") return 0;
    return deriveRevealStep(secondsLeft); // 1..6
  }, [phase, secondsLeft]);

  const aMask = useMemo(() => revealMaskForStep(revealStep, "A"), [revealStep]);
  const bMask = useMemo(() => revealMaskForStep(revealStep, "B"), [revealStep]);

  const aLabels = serverRound.player_a_full || ["", "", ""];
  const bLabels = serverRound.player_b_full || ["", "", ""];

  // winner: use server if provided, otherwise compute locally at step 6
  const localWinner = useMemo(() => {
    if (phase === "reveal" && revealStep === 6 && aLabels[0] && bLabels[0]) {
      const w = compareHands(aLabels, bLabels);
      return w === "Tie" ? null : w;
    }
    return null;
  }, [phase, revealStep, aLabels, bLabels]);

  const winnerText =
    phase === "reveal" && revealStep === 6
      ? localWinner
        ? `Winner: Player ${localWinner}`
        : serverRound.result
        ? `Winner: Player ${serverRound.result}`
        : "Revealing..."
      : phase === "bet"
      ? "Place your bets"
      : "Revealing...";

  // ---------- styles ----------
  const backButtonStyle = (isSelected) => ({
    bgcolor: isSelected ? "#0288d1" : "#64b5f6",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    "&:hover": { bgcolor: "#42a5f5" },
    transition: "0.2s",
  });

  // ---------- render ----------
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
          Round ID: <b>{serverRound.round_id || "Loading..."}</b>
        </Typography>
      </Box>

      {/* GAME AREA */}
      <Box sx={{ position: "relative", bgcolor: "black", height: 400, overflow: "hidden" }}>
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
            <Box sx={{ display: "flex", gap: 0.75, justifyContent: "center" }}>
              {aMask.map((show, i) => (
                <CardBox key={`A-${i}`} revealed={show} label={aLabels[i]} />
              ))}
            </Box>
          </Box>

          {/* TIMER + STATUS */}
          <Box sx={{ textAlign: "center", minWidth: 160 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                px: 2,
                py: 0.5,
                borderRadius: 20,
                bgcolor: phase === "bet" ? "success.main" : "error.main",
                color: "white",
                display: "inline-block",
              }}
            >
              {phase === "bet" ? "Betting" : "Revealing"}: {String(secondsLeft).padStart(2, "0")}s
            </Typography>
            <Typography variant="body2" sx={{ color: "#bbb", mt: 0.5 }}>
              {winnerText}
            </Typography>
          </Box>

          {/* Player B */}
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Player B
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, justifyContent: "center" }}>
              {bMask.map((show, i) => (
                <CardBox key={`B-${i}`} revealed={show} label={bLabels[i]} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* PLAYER ODDS SECTION */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#b0b0b0" }}>
              <TableCell align="center" sx={{ color: "white", fontWeight: "bold", borderRight: "1px solid white" }}>
                Players
              </TableCell>
              <TableCell align="center" sx={{ bgcolor: "#64b5f6", color: "white", fontWeight: "bold" }}>
                Back
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {["A", "B"].map((player) => (
              <TableRow key={player} sx={{ bgcolor: selectedPlayer === player ? "#9e9e9e" : "#bfbfbf" }}>
                <TableCell
                  align="center"
                  sx={{ color: "white", fontWeight: 600, borderRight: "1px solid white" }}
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
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", bgcolor: "#e0e0e0", p: 1 }}>
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

      {/* AMOUNT INPUT + PLACE BET */}
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
              color={phase === "bet" ? "success" : "error"}
              fullWidth
              onClick={handlePlaceBet}
              disabled={!selectedPlayer || !amount || phase !== "bet"}
            >
              {phase === "bet" ? "PLACE BET" : "BET CLOSED"}
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
                sx={{ backgroundColor: "#d9d9d9", textAlign: "center", fontWeight: "bold", color: "black" }}
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
