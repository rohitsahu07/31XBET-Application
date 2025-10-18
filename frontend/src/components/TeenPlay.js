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
import FakeVideoScreen from "./common_components/FakeVideoScreen";

// keep baseURL = "/api" on your axios instance
const buildUrl = (path) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/bets${p}`; // rely on baseURL="/api" to prefix
};

/* ======================= Card UI ======================= */
const CardBox = ({ revealed, label }) => {
  const getCardDisplay = (label) => {
    if (!label || label === "flipped_card") {
      return { rank: "", suitSymbol: "🂠", suitColor: "#888", rankColor: "#888" };
    }
    const [rank, , suit] = label.split(" ");
    let suitSymbol = "";
    let suitColor = "#111";
    let rankColor = "#111";

    switch (suit) {
      case "Hearts":
        suitSymbol = "♥";
        suitColor = "#d32f2f";
        rankColor = suitColor;
        break;
      case "Diamonds":
        suitSymbol = "♦";
        suitColor = "#d32f2f";
        rankColor = suitColor;
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
    return { rank, suitSymbol, suitColor, rankColor };
  };

  const { rank, suitSymbol, suitColor, rankColor } = getCardDisplay(label);

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
              color: rankColor,
              fontSize: { xs: "1.5rem", sm: "1.8rem" },
              lineHeight: 1.1,
            }}
          >
            {rank}
          </Typography>
          <Typography
            sx={{
              color: suitColor,
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
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RVAL = RANKS.reduce((m, r, i) => { m[r] = i + 2; return m; }, {});
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
  const counts = vals.reduce((m, v) => { m[v] = (m[v] || 0) + 1; return m; }, {});
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
  const tA = ra[1], tB = rb[1];
  for (let i = 0; i < Math.max(tA.length, tB.length); i++) {
    if ((tA[i] || 0) !== (tB[i] || 0)) return (tA[i] || 0) > (tB[i] || 0) ? "A" : "B";
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

  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  const tickRef = useRef(null);
  const roundIdRef = useRef(null);
  const phaseRef = useRef(phase);
  const boundaryFetchInFlight = useRef(false);
  const revealFetchInFlight = useRef(false);
  const amountInputRef = useRef(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* ---------- helpers to call backend ---------- */
  const getCurrentRound = async () => {
    const url = buildUrl("/current-round/");
    const res = await api.get(url);
    return res;
  };

  const getLastTen = async () => {
    const url = buildUrl("/feed/last-ten/");
    const res = await api.get(url);
    return res;
  };

  // 🔄 Refresh expo AND broadcast global wallet event (chips+expo)
  const refreshProfile = async () => {
    try {
      const url = buildUrl("/profile/");
      const { data } = await api.get(url);
      const expoNum = parseFloat(data.expo || 0);
      const balanceNum = parseFloat(data.balance || 0);

      // keep screen's expo in sync (used in this screen)
      if (typeof setExpo === "function") setExpo(expoNum);

      // 🔔 tell the top bar / any listener to update chips & expo
      window.dispatchEvent(
        new CustomEvent("wallet:update", {
          detail: {
            balance: balanceNum,
            expo: expoNum,
            is_admin: !!data.is_admin,
            raw: data,
          },
        })
      );
    } catch (e) {
      console.error("[TeenPlay] failed to refresh profile:", e);
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
        // also pull initial chips/expo to populate header if needed
        await refreshProfile();
      } catch (e) {
        console.error("[TeenPlay] initial /current-round/ failed:", e);
        safetyTimer = setTimeout(async () => {
          try {
            const { data } = await getCurrentRound();
            if (!mounted) return;
            applySnapshot(data, true);
            await loadFeed();
            await refreshProfile();
          } catch (ee) {
            console.error("[TeenPlay] fallback /current-round/ failed:", ee);
            startLocalClock();
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
        console.log("[TeenPlay] Expo/Chips refreshed after boundary fetch");
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
    }

    const nextPhase = data.phase || "bet";
    const nextSecs =
      typeof data.seconds_left === "number"
        ? data.seconds_left
        : nextPhase === "reveal"
        ? 10
        : 20;

    const prevPhase = phaseRef.current;

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

    if (nextPhase === "reveal" && data.result) {
      setMatchBets([]);
      showToast(`Round Over — Winner: Player ${data.result}`, "success");
      if (typeof setExpo === "function") setExpo(0);
      refreshProfile();
      setLastResults((prev) => [...prev.slice(-9), data.result]);
      setTimeout(loadFeed, 250);
    }

    if (
      (prevPhase === "reveal" && nextPhase === "bet") ||
      (isNewRound && nextPhase === "bet")
    ) {
      if (typeof setExpo === "function") setExpo(0);
      setTimeout(() => {
        refreshProfile();
        console.log("[TeenPlay] Expo/Chips refreshed at new round start");
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

    setPlacing(true);

    // Optimistic row so user sees the bet right away
    const optimistic = {
      id: Date.now(),
      round_id: serverRound.round_id,
      team: selectedPlayer === "A" ? "Player A" : "Player B",
      rate: "0.96",
      amount: cleanAmount.toString(),
      mode: "Back",
      __optimistic: true,
    };
    setMatchBets((prev) => [...prev, optimistic]);

    try {
      const url = buildUrl("/place-bet/");
      const payload = {
        round_id: serverRound.round_id,
        player: selectedPlayer,
        amount: cleanAmount,
        // send remaining bet-clock seconds; backend adds +10 reveal
        bet_seconds_left: phase === "bet" ? Math.max(0, Math.floor(secondsLeft)) : 0,
      };

      await api.post(url, payload);

      // Pull authoritative values immediately so header shows the deduction now
      await refreshProfile();

      // Confirm optimistic row (optional)
      setMatchBets((prev) =>
        prev.map((r) =>
          r.id === optimistic.id ? { ...r, __optimistic: false } : r
        )
      );

      showToast("✅ Bet placed successfully");
      setAmount("");
      setSelectedPlayer(null);
    } catch (err) {
      // Roll back optimistic UI if the API failed
      setMatchBets((prev) => prev.filter((r) => r.id !== optimistic.id));

      let msg = "❌ Failed to place bet.";
      if (err?.response?.data?.error) msg = `❌ ${err.response.data.error}`;
      else if (err?.code === "ERR_NETWORK") {
        msg = "❌ Network error. Check API base URL / CORS / server.";
      }
      showToast(msg, "error");
      console.error("[TeenPlay] place-bet failed:", err);
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

  const aLabels = useMemo(
    () => serverRound.player_a_full || ["", "", ""],
    [serverRound.player_a_full]
  );
  const bLabels = useMemo(
    () => serverRound.player_b_full || ["", "", ""],
    [serverRound.player_b_full]
  );

  const localWinner = useMemo(() => {
    if (phase === "reveal" && revealStep === 6 && aLabels[0] && bLabels[0]) {
      const w = compareHands(aLabels, bLabels);
      return w === "Tie" ? null : w;
    }
    return null;
  }, [phase, revealStep, aLabels, bLabels]);

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
    winner === player
      ? "#1f7a1f"
      : selectedPlayer === player
      ? "#9e9e9e"
      : "#bfbfbf";
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

      {/* ===== Screen (black) with centered loader ===== */}
      <FakeVideoScreen />

      {/* ===== Game area (separate box below) ===== */}
      <Box sx={{ bgcolor: "black", width: "100%", py: { xs: 1, sm: 1.5 } }}>
        <Box
          sx={{
            bgcolor: "#222",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 1, sm: 3 },
            gap: { xs: 0.5, sm: 2 },
            borderRadius: 0,
            width: "100%",
          }}
        >
          {/* Player A */}
          <Box
            sx={{
              textAlign: "center",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, fontSize: { xs: "0.75rem", sm: "1rem" }, mb: 0.5 }}
            >
              Player A
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "nowrap",
                gap: { xs: 0.3, sm: 0.75 },
                width: "100%",
              }}
            >
              {aMask.map((show, i) => (
                <CardBox key={`A-${i}`} revealed={show} label={aLabels[i]} />
              ))}
            </Box>
          </Box>

          {/* Timer */}
          <Box sx={{ textAlign: "center", flex: "0 0 auto", px: { xs: 0.5, sm: 2 } }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                width: { xs: 35, sm: 60 },
                height: { xs: 35, sm: 60 },
                borderRadius: "50%",
                bgcolor: phase === "bet" ? "#2196f3" : "error.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: { xs: "0.9rem", sm: "1.2rem" },
                boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                mx: "auto",
              }}
            >
              {String(secondsLeft).padStart(2, "0")}
            </Typography>
          </Box>

          {/* Player B */}
          <Box
            sx={{
              textAlign: "center",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, fontSize: { xs: "0.75rem", sm: "1rem" }, mb: 0.5 }}
            >
              Player B
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "nowrap",
                gap: { xs: 0.3, sm: 0.75 },
                width: "100%",
              }}
            >
              {bMask.map((show, i) => (
                <CardBox key={`B-${i}`} revealed={show} label={bLabels[i]} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* PLAYER ODDS */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: 1, overflow: "hidden", boxShadow: "0 3px 6px rgba(0,0,0,0.15)" }}
      >
        <Table sx={{ tableLayout: "fixed", width: "100%", "& th, & td": { textAlign: "center" } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#063b65ff" }}>
              {[
                { label: "Players", width: "70%" },
                { label: "Back", width: "30%" },
              ].map((col, i) => (
                <TableCell
                  key={i}
                  sx={{
                    width: col.width,
                    color: "#fff",
                    fontWeight: "bold",
                    borderRight: i === 0 ? "1px solid #fff" : 0,
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {["A", "B"].map((player) => (
              <TableRow
                key={player}
                sx={{ bgcolor: rowBg(player), transition: "background-color 0.2s ease", cursor: "pointer" }}
              >
                <TableCell
                  sx={{ width: "70%", fontWeight: 600, color: rowTextColor(player), borderRight: "1px solid #fff" }}
                >
                  Player {player}
                </TableCell>

                <TableCell
                  onClick={() => {
                    onSelectPlayer(player);
                    setTimeout(() => amountInputRef.current?.focus(), 100);
                  }}
                  sx={{ ...backButtonStyle(selectedPlayer === player), width: "30%", "&:hover": { opacity: 0.9 } }}
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
              bgcolor: "#1f7a1f",
              color: "#ffeb3b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.96rem",
            }}
            title={res === "A" ? "Player A" : "Player B"}
          >
            {res}
          </Box>
        ))}
      </Box>

      {/* AMOUNT + PLACE BET */}
      <Box sx={{ bgcolor: "#efebebff", py: 1.5, px: 2 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="center"
          spacing={1}
          wrap="nowrap"
          sx={{
            flexWrap: "nowrap",
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {/* Label */}
          <Grid item sx={{ minWidth: 70 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Amount</Typography>
          </Grid>

          {/* Input */}
          <Grid item sx={{ minWidth: 130 }}>
            <TextField
              inputRef={amountInputRef}
              type="number"
              size="small"
              fullWidth
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              sx={{
                bgcolor: "#fff",
                borderRadius: 1,
                "& input": { textAlign: "center", fontSize: "0.9rem", p: "4px" },
              }}
            />
          </Grid>

          {/* Button */}
          <Grid item sx={{ minWidth: 100 }}>
            <Button
              variant="contained"
              color={phase === "bet" ? "success" : "error"}
              fullWidth
              onClick={handlePlaceBet}
              disabled={placing || !selectedPlayer || !amount || phase !== "bet"}
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "none",
                whiteSpace: "nowrap",
                height: 36,
              }}
            >
              {placing ? "Placing..." : phase === "bet" ? "Place Bet" : "Bet Closed"}
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

      <Box sx={{ mt: 2, mb: 2 }}>
        <BackToMainMenuButton />
      </Box>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
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
