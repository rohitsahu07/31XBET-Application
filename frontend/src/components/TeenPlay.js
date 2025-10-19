// src/components/TeenPlay.js
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Grid, Typography, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Snackbar, Alert,
} from "@mui/material";
import api from "../services/api";
import BackToMainMenuButton from "./common_components/BackToMenuBtn";
import FakeVideoScreen from "./common_components/FakeVideoScreen";

// relies on axios baseURL="/api"
const buildUrl = (path) => (path.startsWith("/") ? `/bets${path}` : `/bets/${path}`);

const CardBox = ({ label }) => {
  const revealed = label && label !== "flipped_card";
  const getCardDisplay = (lbl) => {
    if (!revealed) return { rank: "", suitSymbol: "🂠", suitColor: "#888", rankColor: "#888" };
    const [rank, , suit] = String(lbl).split(" ");
    const red = suit === "Hearts" || suit === "Diamonds";
    const suitSymbol = suit === "Hearts" ? "♥" : suit === "Diamonds" ? "♦" : suit === "Clubs" ? "♣" : "♠";
    const color = red ? "#d32f2f" : "#111";
    return { rank, suitSymbol, suitColor: color, rankColor: color };
  };
  const { rank, suitSymbol, suitColor, rankColor } = getCardDisplay(label);
  return (
    <Box sx={{
      width: 62, height: 84, borderRadius: "8px",
      bgcolor: revealed ? "#ffffff" : "#1d1f22",
      border: "1px solid rgba(255,255,255,0.25)",
      boxShadow: revealed ? "0 0 8px rgba(255,255,255,0.35)" : "none",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", transition: "0.2s ease", transform: revealed ? "scale(1.03)" : "scale(1)",
    }}>
      {revealed ? (
        <>
          <Typography sx={{ fontWeight: 900, color: rankColor, fontSize: { xs: "1.5rem", sm: "1.8rem" }, lineHeight: 1.1 }}>
            {rank}
          </Typography>
          <Typography sx={{ color: suitColor, fontSize: { xs: "2rem", sm: "2.4rem" }, lineHeight: 1, fontWeight: 800 }}>
            {suitSymbol}
          </Typography>
        </>
      ) : (
        <Typography sx={{
          width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: { xs: "3.8rem", sm: "5rem" }, color: "#888", lineHeight: 1,
          bgcolor: "#1d1f22", background: "linear-gradient(135deg, #2c2f33, #1a1c1e)",
        }}>
          🂠
        </Typography>
      )}
    </Box>
  );
};

/* Ranking helpers (unchanged) */
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RVAL = RANKS.reduce((m, r, i) => (m[r] = i + 2, m), {});
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
  const counts = vals.reduce((m, v) => (m[v] = (m[v] || 0) + 1, m), {});
  const isFlush = new Set(suits).size === 1;
  const [seq, seqTie] = isSequence(vals);
  if (Object.keys(counts).length === 1) return [6, [sortedVals[0]]];
  if (isFlush && seq) return [5, seqTie];
  if (seq) return [4, seqTie];
  if (isFlush) return [3, sortedVals];
  if (Object.keys(counts).length === 2) {
    const pairVal = +Object.keys(counts).sort((a, b) => counts[b] - counts[a] || b - a)[0];
    const kicker = Math.max(...vals.filter((v) => v !== pairVal));
    return [2, [pairVal, kicker]];
  }
  return [1, sortedVals];
};
const compareHands = (a, b) => {
  const ra = handRank(a), rb = handRank(b);
  if (ra[0] !== rb[0]) return ra[0] > rb[0] ? "A" : "B";
  const tA = ra[1], tB = rb[1];
  for (let i = 0; i < Math.max(tA.length, tB.length); i++) {
    if ((tA[i] || 0) !== (tB[i] || 0)) return (tA[i] || 0) > (tB[i] || 0) ? "A" : "B";
  }
  return "Tie";
};

function TeenPlay({ setExpo }) {
  // Keep round_id as a STRING everywhere
  const [serverRound, setServerRound] = useState({
    round_id: "", // string
    phase: "bet",
    seconds_left: 20,
    result: null,
    player_a_cards: ["flipped_card", "flipped_card", "flipped_card"],
    player_b_cards: ["flipped_card", "flipped_card", "flipped_card"],
    player_a_full: null,
    player_b_full: null,
  });
  const [lastResults, setLastResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [amount, setAmount] = useState("");
  const [matchBets, setMatchBets] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

  const roundIdRef = useRef(""); // string
  const phaseRef = useRef(serverRound.phase);
  const pollRef = useRef(null);
  const inflightRef = useRef(false);
  const amountInputRef = useRef(null);

  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });
  useEffect(() => { phaseRef.current = serverRound.phase; }, [serverRound.phase]);

  const getCurrentRound = async () => api.get(buildUrl("/current-round/"));
  const getLastTen = async () => api.get(buildUrl("/feed/last-ten/"));
  const refreshProfile = async () => {
    try {
      const { data } = await api.get(buildUrl("/profile/"));
      const expoNum = parseFloat(data.expo || 0);
      const balanceNum = parseFloat(data.balance || 0);
      if (typeof setExpo === "function") setExpo(expoNum);
      window.dispatchEvent(new CustomEvent("wallet:update", {
        detail: { balance: balanceNum, expo: expoNum, is_admin: !!data.is_admin, raw: data },
      }));
    } catch {}
  };
  const loadFeed = async () => {
    try {
      const { data } = await getLastTen();
      const items = (data?.items || []).map((it) => it.final_result || it.official_winner).filter(Boolean);
      setLastResults(items.reverse().slice(-10));
    } catch {}
  };

  const applySnapshot = (data) => {
    try { console.log("[CURRENT-ROUND]\n" + JSON.stringify(data, null, 2)); } catch {}

    // Coerce to string once and use consistently
    const nextRoundId = (data?.round_id ?? "").toString();

    const isNewRound = roundIdRef.current !== nextRoundId && nextRoundId !== "";
    const prevPhase = phaseRef.current;

    if (isNewRound) {
      roundIdRef.current = nextRoundId;
      setSelectedPlayer(null);
      setMatchBets([]);
    }

    setServerRound({
      round_id: nextRoundId, // ← always string
      phase: data?.phase || "bet",
      seconds_left: typeof data?.seconds_left === "number" ? data.seconds_left : 0,
      result: data?.result ?? null,
      player_a_cards: Array.isArray(data?.player_a_cards) ? data.player_a_cards : ["flipped_card","flipped_card","flipped_card"],
      player_b_cards: Array.isArray(data?.player_b_cards) ? data.player_b_cards : ["flipped_card","flipped_card","flipped_card"],
      player_a_full: data?.player_a_full || null,
      player_b_full: data?.player_b_full || null,
    });

    if ((prevPhase === "reveal" && data?.phase === "bet") || isNewRound) {
      setTimeout(loadFeed, 150);
      setTimeout(refreshProfile, 400);
    }
    if (data?.result) {
      showToast(`Round Over — Winner: Player ${data.result}`, "success");
      setTimeout(refreshProfile, 300);
    }
  };

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      if (!mounted || inflightRef.current) return;
      inflightRef.current = true;
      try {
        const { data } = await getCurrentRound();
        if (mounted) applySnapshot(data);
      } finally { inflightRef.current = false; }
    };
    poll(); // initial snapshot
    pollRef.current = setInterval(poll, 1000); // 1Hz sync with 30s machine
    return () => { mounted = false; if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectPlayer = (player) => {
    if (serverRound.phase !== "bet") return showToast("Bet window is closed. Wait for next round.", "info");
    setSelectedPlayer(player);
  };

  const handlePlaceBet = async () => {
    if (!selectedPlayer || !amount) return showToast("Select a player and enter an amount.", "info");
    if (serverRound.phase !== "bet") return showToast("Bet window is closed. Wait for next round.", "info");
    const cleanAmount = Number.parseFloat(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) return showToast("Enter a valid amount (> 0).", "error");
    if (placing) return;

    setPlacing(true);
    const optimistic = {
      id: Date.now(),
      round_id: String(serverRound.round_id), // keep as string
      team: selectedPlayer === "A" ? "Player A" : "Player B",
      rate: "0.96",
      amount: cleanAmount.toString(),
      mode: "Back",
      __optimistic: true,
    };
    setMatchBets((prev) => [...prev, optimistic]);

    try {
      await api.post(buildUrl("/place-bet/"), {
        round_id: String(serverRound.round_id), // ← send as string
        player: selectedPlayer,
        amount: cleanAmount,
        bet_seconds_left:
          serverRound.phase === "bet" ? Math.max(0, Math.floor(serverRound.seconds_left || 0)) : 0,
      });
      await refreshProfile();
      setMatchBets((prev) => prev.map((r) => (r.id === optimistic.id ? { ...r, __optimistic: false } : r)));
      showToast("✅ Bet placed successfully");
      setAmount(""); setSelectedPlayer(null);
    } catch (err) {
      setMatchBets((prev) => prev.filter((r) => r.id !== optimistic.id));
      showToast(err?.response?.data?.error ? `❌ ${err.response.data.error}` : "❌ Failed to place bet.", "error");
    } finally { setPlacing(false); }
  };

  const aCards = serverRound.player_a_cards || ["flipped_card","flipped_card","flipped_card"];
  const bCards = serverRound.player_b_cards || ["flipped_card","flipped_card","flipped_card"];

  const localWinner = useMemo(() => {
    const allA = aCards.every((c) => c && c !== "flipped_card");
    const allB = bCards.every((c) => c && c !== "flipped_card");
    if (serverRound.phase === "reveal" && allA && allB) {
      const w = compareHands(aCards, bCards);
      return w === "Tie" ? null : w;
    }
    return null;
  }, [serverRound.phase, aCards, bCards]);

  const winner = serverRound.result || localWinner;

  const backButtonStyle = (isSelected) => ({
    bgcolor: isSelected ? "#0288d1" : "#64b5f6",
    color: "white", fontWeight: "bold", cursor: "pointer",
    "&:hover": { bgcolor: "#42a5f5" }, transition: "0.2s",
  });
  const rowBg = (player) => (winner === player ? "#1f7a1f" : selectedPlayer === player ? "#9e9e9e" : "#bfbfbf");
  const rowTextColor = (player) => (winner === player ? "white" : "#000");

  return (
    <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ background: "linear-gradient(to right, #004d40, #00796b)", color: "white", px: 2, py: 1, mt: 1,
                 borderRadius: "6px 6px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Teen Patti 20-20</Typography>
        <Typography variant="subtitle2">Round ID: <b>{serverRound.round_id || "Loading..."}</b></Typography>
      </Box>

      <FakeVideoScreen />

      <Box sx={{ bgcolor: "black", width: "100%", py: { xs: 1, sm: 1.5 } }}>
        <Box sx={{ bgcolor: "#222", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between",
                   px: { xs: 1, sm: 3 }, gap: { xs: 0.5, sm: 2 }, borderRadius: 0, width: "100%" }}>
          <Box sx={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, fontSize: { xs: "0.75rem", sm: "1rem" }, mb: 0.5 }}>Player A</Typography>
            <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "nowrap", gap: { xs: 0.3, sm: 0.75 }, width: "100%" }}>
              {aCards.map((lbl, i) => <CardBox key={`A-${i}`} label={lbl} />)}
            </Box>
          </Box>

          <Box sx={{ textAlign: "center", flex: "0 0 auto", px: { xs: 0.5, sm: 2 } }}>
            <Typography variant="subtitle2" sx={{
              fontWeight: 700, width: { xs: 35, sm: 60 }, height: { xs: 35, sm: 60 }, borderRadius: "50%",
              bgcolor: serverRound.phase === "bet" ? "#2196f3" : "error.main", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: { xs: "0.9rem", sm: "1.2rem" }, boxShadow: "0 0 10px rgba(0,0,0,0.3)", mx: "auto",
            }}>
              {String(serverRound.seconds_left ?? 0).padStart(2, "0")}
            </Typography>
          </Box>

          <Box sx={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, fontSize: { xs: "0.75rem", sm: "1rem" }, mb: 0.5 }}>Player B</Typography>
            <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "nowrap", gap: { xs: 0.3, sm: 0.75 }, width: "100%" }}>
              {bCards.map((lbl, i) => <CardBox key={`B-${i}`} label={lbl} />)}
            </Box>
          </Box>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 1, overflow: "hidden", boxShadow: "0 3px 6px rgba(0,0,0,0.15)" }}>
        <Table sx={{ tableLayout: "fixed", width: "100%", "& th, & td": { textAlign: "center" } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#063b65ff" }}>
              {[{ label: "Players", width: "70%" }, { label: "Back", width: "30%" }].map((col, i) => (
                <TableCell key={i} sx={{ width: col.width, color: "#fff", fontWeight: "bold", borderRight: i === 0 ? "1px solid #fff" : 0 }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {["A", "B"].map((player) => (
              <TableRow key={player} sx={{ bgcolor: rowBg(player), transition: "background-color 0.2s ease", cursor: "pointer" }}>
                <TableCell sx={{ width: "70%", fontWeight: 600, color: rowTextColor(player), borderRight: "1px solid #fff" }}>
                  Player {player}
                </TableCell>
                <TableCell
                  onClick={() => { onSelectPlayer(player); setTimeout(() => amountInputRef.current?.focus(), 100); }}
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

      <Box sx={{ bgcolor: "#004d40", color: "white", p: 1 }}>
        <Typography sx={{ fontWeight: 600 }}>Last Result</Typography>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", bgcolor: "#e0e0e0", p: 1, gap: 0.5 }}>
        {lastResults.map((res, i) => (
          <Box
            key={`${res}-${i}`}
            sx={{
              width: 28, height: 28, borderRadius: "50%", bgcolor: "#1f7a1f",
              color: "#ffeb3b", display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 800, fontSize: "0.96rem"
            }}
            title={res === "A" ? "Player A" : "Player B"}
          >
            {res}
          </Box>
        ))}
      </Box>

      <Box sx={{ bgcolor: "#efebebff", py: 1.5, px: 2 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="center"
          spacing={1}
          wrap="nowrap"
          sx={{ flexWrap: "nowrap", overflowX: "auto", "&::-webkit-scrollbar": { display: "none" } }}
        >
          <Grid item sx={{ minWidth: 70 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Amount</Typography>
          </Grid>
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
                "& input": { textAlign: "center", fontSize: "0.9rem", p: "4px" }
              }}
            />
          </Grid>
          <Grid item sx={{ minWidth: 100 }}>
            <Button
              variant="contained"
              color={serverRound.phase === "bet" ? "success" : "error"}
              fullWidth
              onClick={handlePlaceBet}
              disabled={placing || !selectedPlayer || !amount || serverRound.phase !== "bet"}
              sx={{ fontWeight: 600, fontSize: "0.75rem", textTransform: "none", whiteSpace: "nowrap", height: 36 }}
            >
              {placing ? "Placing..." : serverRound.phase === "bet" ? "Place Bet" : "Bet Closed"}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell colSpan={4} sx={{ backgroundColor: "#d9d9d9", textAlign: "center", fontWeight: "bold", color: "black" }}>
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
              <TableRow><TableCell colSpan={4} align="center">No bets</TableCell></TableRow>
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

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"d
          sx={{ width: "100%" }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TeenPlay;
