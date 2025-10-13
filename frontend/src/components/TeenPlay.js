// src/components/TeenPlay.js
import { useEffect, useMemo, useRef, useState } from "react";
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
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../services/api";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";

/* -----------------------------------------------------------
   API root builder (prevents /api/api/... mistakes)
   - If baseURL ends with '/api' → use '/bets/...'
   - Else → use '/api/bets/...'
----------------------------------------------------------- */
const buildUrl = (path) => {
  const base = (api.defaults?.baseURL || "").replace(/\/+$/, "");
  const root = base.endsWith("/api") ? "/bets" : "/api/bets";
  return `${root}${path}`;
};

/* ======================= Card UI ======================= */
const CardBox = ({ revealed, label }) => {
  const getCardDisplay = (label) => {
    if (!label || label === "flipped_card") {
      return { rank: "", suitSymbol: "🂠", color: "#888" };
    }
    const [rank, , suit] = label.split(" ");
    let suitSymbol = "";
    let color = "#000";
    switch (suit) {
      case "Hearts":
        suitSymbol = "♥";
        color = "red";
        break;
      case "Diamonds":
        suitSymbol = "♦";
        color = "red";
        break;
      case "Clubs":
        suitSymbol = "♣";
        break;
      case "Spades":
        suitSymbol = "♠";
        break;
      default:
        suitSymbol = "?";
    }
    return { rank, suitSymbol, color };
  };

  const { rank, suitSymbol, color } = getCardDisplay(label);

  return (
    <Box
      sx={{
        width: 62,
        height: 84,
        borderRadius: "8px",
        bgcolor: revealed ? "#ffffff" : "#1d1f22",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow: revealed ? "0 0 8px rgba(255,255,255,0.35)" : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        transition: "0.2s ease",
        transform: revealed ? "scale(1.03)" : "scale(1)",
      }}
    >
      {revealed ? (
        <>
          <Typography
            sx={{
              fontWeight: 900,
              color: "#111",
              fontSize: { xs: "1.5rem", sm: "1.8rem" },
              lineHeight: 1.1,
            }}
          >
            {rank}
          </Typography>
          <Typography
            sx={{
              color: color,
              fontSize: { xs: "2rem", sm: "2.4rem" },
              lineHeight: 1,
              fontWeight: 800,
            }}
          >
            {suitSymbol}
          </Typography>
        </>
      ) : (
        <Typography
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: { xs: "3.8rem", sm: "5rem" },
            color: "#888",
            lineHeight: 1,
            bgcolor: "#1d1f22",
            background: "linear-gradient(135deg, #2c2f33, #1a1c1e)",
          }}
        >
          🂠
        </Typography>
      )}
    </Box>
  );
};

/* ======================= Reveal helpers ======================= */
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

const deriveRevealStep = (secondsLeftReveal) => {
  const elapsed = Math.max(0, 10 - (secondsLeftReveal ?? 10));
  return Math.min(6, Math.max(1, Math.floor((elapsed / 10) * 6) + 1));
};

/* ======================= Teen Patti ranking ======================= */
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RVAL = RANKS.reduce((m, r, i) => {
  m[r] = i + 2;
  return m;
}, {});
const parseRank = (c) => c?.split(" of ")[0];
const parseSuit = (c) => c?.split(" of ")[1];

const isSequence = (values) => {
  const v = [...values].sort((a, b) => a - b);
  if (new Set(v).size !== 3) return [false, []];
  if (v[0] === 2 && v[1] === 3 && v[2] === 14) return [true, [3, 2, 1]];
  const ok = v[0] + 1 === v[1] && v[1] + 1 === v[2];
  return [ok, [...values].sort((a, b) => b - a)];
};

const handRank = (cards) => {
  const vals = cards.map((c) => RVAL[parseRank(c)]);
  const suits = cards.map(parseSuit);
  const sortedVals = [...vals].sort((a, b) => b - a);
  const counts = vals.reduce((m, v) => {
    m[v] = (m[v] || 0) + 1;
    return m;
  }, {});
  const isFlush = new Set(suits).size === 1;
  const [seq, seqTie] = isSequence(vals);

  if (Object.keys(counts).length === 1) return [6, [sortedVals[0]]];
  if (isFlush && seq) return [5, seqTie];
  if (seq) return [4, seqTie];
  if (isFlush) return [3, sortedVals];
  if (Object.keys(counts).length === 2) {
    const pairVal = +Object.keys(counts).sort(
      (a, b) => counts[b] - counts[a] || b - a
    )[0];
    const kicker = Math.max(...vals.filter((v) => v !== pairVal));
    return [2, [pairVal, kicker]];
  }
  return [1, sortedVals];
};

const compareHands = (a, b) => {
  const ra = handRank(a);
  const rb = handRank(b);
  if (ra[0] !== rb[0]) return ra[0] > rb[0] ? "A" : "B";
  const tA = ra[1],
    tB = rb[1];
  for (let i = 0; i < Math.max(tA.length, tB.length); i++) {
    if ((tA[i] || 0) !== (tB[i] || 0))
      return (tA[i] || 0) > (tB[i] || 0) ? "A" : "B";
  }
  return "Tie";
};

/* ======================= Component ======================= */
function TeenPlay({ setExpo }) {
  const [serverRound, setServerRound] = useState({
    round_id: null,
    phase: "bet",
    seconds_left: 20,
    result: null,
    player_a_full: null,
    player_b_full: null,
  });

  const [phase, setPhase] = useState("bet");
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [lastResults, setLastResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [amount, setAmount] = useState("");
  const [matchBets, setMatchBets] = useState([]);
  const [placing, setPlacing] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    msg: "",
    severity: "success",
  });

  const showToast = (msg, severity = "success") =>
    setToast({ open: true, msg, severity });

  const tickRef = useRef(null);
  const roundIdRef = useRef(null);
  const phaseRef = useRef(phase);
  const boundaryFetchInFlight = useRef(false);
  const revealFetchInFlight = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* ---------- helpers to call backend ---------- */
  const getCurrentRound = async () => {
    const url = buildUrl("/current-round/");
    console.log(
      "[TeenPlay] GET",
      url,
      "baseURL:",
      api.defaults?.baseURL || "(none)"
    );
    const res = await api.get(url);
    console.log("[TeenPlay] /current-round response:", res.data);
    return res;
  };

  const getLastTen = async () => {
    const url = buildUrl("/feed/last-ten/");
    console.log("[TeenPlay] GET", url);
    const res = await api.get(url);
    console.log("[TeenPlay] /feed/last-ten response:", res.data);
    return res;
  };

  const postPlaceBet = async (payload) => {
    const url = buildUrl("/place-bet/");
    console.log("[TeenPlay] POST", url, payload);
    // NOTE: no per-request short timeout — let the global axios timeout handle it
    const res = await api.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("[TeenPlay] /place-bet response:", res.data);
    return res;
  };

  // 🔄 Refresh expo (balance/exposure) from backend profile
  const refreshProfile = async () => {
    try {
      const url = buildUrl("/profile/");
      const { data } = await api.get(url);
      if (typeof setExpo === "function") {
        setExpo(parseFloat(data.expo || 0));
      }
    } catch (e) {
      console.error("[TeenPlay] failed to refresh expo:", e);
    }
  };

  /* ---------- last 10 feed ---------- */
  const loadFeed = async () => {
    try {
      const { data } = await getLastTen();
      const items = (data?.items || [])
        .map((it) => it.final_result || it.official_winner)
        .filter(Boolean);
      setLastResults(items.reverse().slice(-10));
    } catch (e) {
      console.error("[TeenPlay] failed loading last-ten feed:", e);
    }
  };

  /* ---------- initial fetch ---------- */
  useEffect(() => {
    let mounted = true;
    let safetyTimer = null;

    const firstLoad = async () => {
      try {
        const { data } = await getCurrentRound();
        if (!mounted) return;
        applySnapshot(data, true);
        await loadFeed();
      } catch (e) {
        console.error("[TeenPlay] initial /current-round/ failed:", e);
        safetyTimer = setTimeout(async () => {
          try {
            const { data } = await getCurrentRound();
            if (!mounted) return;
            applySnapshot(data, true);
            await loadFeed();
          } catch (ee) {
            console.error("[TeenPlay] fallback /current-round/ failed:", ee);
            startLocalClock(); // still tick; boundary fetch will resync
          }
        }, 1000);
      }
    };

    firstLoad();

    return () => {
      mounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
      stopLocalClock();
    };
  }, []);

  /* ---------- local clock ---------- */
  const startLocalClock = () => {
    stopLocalClock();
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        const p = phaseRef.current;
        if (p === "bet") {
          setPhase("reveal");
          triggerRevealStartFetch();
          return 10;
        } else {
          triggerBoundaryFetch();
          return prev; // hold at 1 while syncing boundary
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

  /* ---------- phase-change fetches ---------- */
  const triggerRevealStartFetch = async () => {
    if (revealFetchInFlight.current) return;
    revealFetchInFlight.current = true;
    try {
      const { data } = await getCurrentRound();
      applySnapshot(data, true);
    } catch (e) {
      console.error("Reveal-start fetch failed:", e);
      setTimeout(triggerRevealStartFetch, 600);
    } finally {
      revealFetchInFlight.current = false;
    }
  };

  const triggerBoundaryFetch = async () => {
    if (boundaryFetchInFlight.current) return;
    boundaryFetchInFlight.current = true;
    try {
      const { data } = await getCurrentRound();
      applySnapshot(data, true);
      setTimeout(loadFeed, 300);
      setTimeout(() => {
        refreshProfile();
        console.log("[TeenPlay] Expo refreshed after boundary fetch");
      }, 1000);
    } catch (e) {
      console.error("Boundary fetch failed:", e);
      setTimeout(triggerBoundaryFetch, 1200);
    } finally {
      boundaryFetchInFlight.current = false;
    }
  };

  /* ---------- apply snapshot ---------- */
  const applySnapshot = (data, resetClock = false) => {
    const isNewRound = roundIdRef.current !== data.round_id;

    if (isNewRound) {
      setTimeout(loadFeed, 300);
      roundIdRef.current = data.round_id;
      setSelectedPlayer(null);
      setMatchBets([]);
      // keep UI clean at new round start
      //if (typeof setExpo === "function") setExpo(0);
    }

    const nextPhase = data.phase || "bet";
    const nextSecs =
      typeof data.seconds_left === "number" ? data.seconds_left : nextPhase === "reveal" ? 10 : 20;

    // NEW: capture previous phase BEFORE we mutate phase state
    const prevPhase = phaseRef.current; // <— this stays in sync via the useEffect above

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

    // result arrived at end of reveal
    if (nextPhase === "reveal" && data.result) {
      setMatchBets([]);
      showToast(`Round Over — Winner: Player ${data.result}`, "success");
      if (typeof setExpo === "function") setExpo(0);
      refreshProfile();               // <— pulls expo=0 from backend (new round has new id)
      setLastResults((prev) => [...prev.slice(-9), data.result]);
      setTimeout(loadFeed, 250);
    }

    // ✅ Unified expo refresh logic to avoid double /profile/ calls
    if ((prevPhase === "reveal" && nextPhase === "bet") || (isNewRound && nextPhase === "bet")) {
      if (typeof setExpo === "function") setExpo(0);
      setTimeout(() => {
        refreshProfile();
        console.log("[TeenPlay] Expo refreshed after new round start");
      }, 1000);
    }

    if (resetClock) {
      stopLocalClock();
      startLocalClock();
    }


    if (nextPhase === "bet" && !isNewRound) {
      setMatchBets([]);
    }
  };


  /* ---------- player selection ---------- */
  const onSelectPlayer = (player) => {
    if (phase !== "bet") {
      showToast("Bet window is closed. Wait for next round.", "info");
      return;
    }
    setSelectedPlayer(player);
  };

  /* ---------- place bet ---------- */
  const handlePlaceBet = async () => {
    if (!selectedPlayer || !amount) {
      showToast("Select a player and enter an amount.", "info");
      return;
    }
    if (phase !== "bet") {
      showToast("Bet window is closed. Wait for next round.", "info");
      return;
    }
    const cleanAmount = Number.parseFloat(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      showToast("Enter a valid amount (> 0).", "error");
      return;
    }
    if (placing) return;

    const payload = {
      round_id: serverRound.round_id,
      player: selectedPlayer,
      amount: cleanAmount,
    };

    setPlacing(true);
    try {
      const { data } = await postPlaceBet(payload);

      // Append immediately to MATCH BETS
      setMatchBets((prev) => [
        ...prev,
        {
          id: Date.now(),
          round_id: serverRound.round_id,
          team: selectedPlayer === "A" ? "Player A" : "Player B",
          rate: "0.96",
          amount: cleanAmount.toString(),
          mode: "Back",
        },
      ]);

      if (typeof setExpo === "function") {
        setExpo((prev) => prev + cleanAmount);
      }

      setAmount("");
      setSelectedPlayer(null);
      showToast("✅ Bet placed successfully");
    } catch (err) {
      console.error("[TeenPlay] place-bet failed:", err);
      let msg = "❌ Failed to place bet.";
      if (err?.code === "ERR_NETWORK" || err?.message?.includes("Network Error")) {
        msg =
          "❌ Network error placing bet. Check CORS / URL / server availability.";
        console.log("Axios config used:", err?.config);
        console.log("Was baseURL correct?", api.defaults?.baseURL);
      } else if (err?.code === "ECONNABORTED") {
        msg = "❌ Request timed out. Try again.";
      } else if (err?.response) {
        msg = `❌ Bet failed (${err.response.status}).`;
        console.log("Server responded:", err.response.data);
      }
      showToast(msg, "error");
    } finally {
      setPlacing(false);
    }
  };

  /* ---------- derived reveal state ---------- */
  const revealStep = useMemo(() => {
    if (phase !== "reveal") return 0;
    return deriveRevealStep(secondsLeft);
  }, [phase, secondsLeft]);

  const aMask = useMemo(() => revealMaskForStep(revealStep, "A"), [revealStep]);
  const bMask = useMemo(() => revealMaskForStep(revealStep, "B"), [revealStep]);

  const aLabels = serverRound.player_a_full || ["", "", ""];
  const bLabels = serverRound.player_b_full || ["", "", ""];

  const localWinner = useMemo(() => {
    if (phase === "reveal" && revealStep === 6 && aLabels[0] && bLabels[0]) {
      const w = compareHands(aLabels, bLabels);
      return w === "Tie" ? null : w;
    }
    return null;
  }, [phase, revealStep, aLabels, bLabels]);

  // Prefer server result; fall back to local computation at end of reveal
  const winner = serverRound.result || localWinner;

  /* ---------- styles ---------- */
  const backButtonStyle = (isSelected) => ({
    bgcolor: isSelected ? "#0288d1" : "#64b5f6",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    "&:hover": { bgcolor: "#42a5f5" },
    transition: "0.2s",
  });
  const rowBg = (player) =>
    winner === player ? "#1f7a1f" : selectedPlayer === player ? "#9e9e9e" : "#bfbfbf";
  const rowTextColor = (player) => (winner === player ? "white" : "#000");

  /* ------------------------------ render ------------------------------ */
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
      <Box
        sx={{
          position: "relative",
          bgcolor: "black",
          height: 400,
          overflow: "hidden",
        }}
      >
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

          {/* TIMER */}
          <Box sx={{ textAlign: "center", minWidth: 160 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                width: 60,
                height: 60,
                borderRadius: "50%",
                bgcolor: phase === "bet" ? "#2196f3" : "error.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                mx: "auto",
              }}
            >
              {String(secondsLeft).padStart(2, "0")}
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

      {/* PLAYER ODDS */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#063b65ff" }}>
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
                  bgcolor: "#063b65ff",
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
                  bgcolor: rowBg(player),
                  transition: "background-color 0.2s ease",
                }}
              >
                <TableCell
                  align="center"
                  sx={{
                    color: rowTextColor(player),
                    fontWeight: 600,
                    borderRight: "1px solid white",
                  }}
                >
                  Player {player}
                </TableCell>
                <TableCell
                  align="center"
                  sx={backButtonStyle(selectedPlayer === player)}
                  onClick={() => onSelectPlayer(player)}
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
          gap: 0.5,
        }}
      >
        {lastResults.map((res, i) => (
          <Box
            key={`${res}-${i}`}
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: "#1f7a1f", // green
              color: "#ffeb3b", // yellow letter
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.95rem",
            }}
            title={res === "A" ? "Player A" : "Player B"}
          >
            {res}
          </Box>
        ))}
      </Box>

      {/* AMOUNT + PLACE BET */}
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
              disabled={placing || !selectedPlayer || !amount || phase !== "bet"}
            >
              {placing
                ? "PLACING..."
                : phase === "bet"
                ? "PLACE BET"
                : "BET CLOSED"}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* MATCH BETS */}
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
              matchBets.map((bet) => (
                <TableRow key={bet.id}>
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

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TeenPlay;
