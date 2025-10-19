# backend/bets/engine.py
from __future__ import annotations
import random, threading, time
from typing import List, Optional, Tuple
from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.db.models import Sum

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Round, Bet, Counter        # ⬅️ include Counter
from users.models import User

# ─────────────────────────────────────────────
# Globals / timings
# ─────────────────────────────────────────────
_LOCK = threading.RLock()
FLIPPED = "flipped_card"
BET_SECONDS = 20
REVEAL_SECONDS = 10
CYCLE_SECONDS = BET_SECONDS + REVEAL_SECONDS
CURRENT_ROUND: Optional[dict] = None
_ENGINE_STARTED = False

# Seed for your sequential Round IDs
STARTING_ROUND_ID = 102251019225904  # ⬅️ your initial value

# ─────────────────────────────────────────────
# Time helpers
# ─────────────────────────────────────────────
def ts_to_dt(ts: int):
    return timezone.make_aware(
        datetime.fromtimestamp(int(ts)),
        timezone.get_current_timezone()
    )

def now_dt():
    return timezone.now()

# ─────────────────────────────────────────────
# Cards / dealing + ranking
# ─────────────────────────────────────────────
def _fresh_deck() -> List[str]:
    ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]
    suits = ["Hearts","Diamonds","Clubs","Spades"]
    return [f"{r} of {s}" for s in suits for r in ranks]

def _deal_two_hands() -> Tuple[List[str], List[str]]:
    deck = _fresh_deck()
    rng = random.SystemRandom()
    rng.shuffle(deck)
    return deck[0:3], deck[3:6]

def pretty(cards: List[str]) -> str:
    return ", ".join(cards)

def _compare_teen_patti(a: List[str], b: List[str]) -> str:
    ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]
    rval = {r: i + 2 for i, r in enumerate(ranks)}
    pr = lambda c: c.split(" of ")[0]
    ps = lambda c: c.split(" of ")[1]

    def is_seq(vals):
        v = sorted(vals)
        if len(set(v)) != 3:
            return False, []
        if v == [2, 3, 14]:
            return True, [3, 2, 1]  # A-2-3
        ok = v[0] + 1 == v[1] and v[1] + 1 == v[2]
        return ok, sorted(vals, reverse=True)

    def score(cards):
        vals = [rval[pr(c)] for c in cards]
        suits = [ps(c) for c in cards]
        sv = sorted(vals, reverse=True)
        counts = {}
        for v in vals: counts[v] = counts.get(v, 0) + 1
        flush = len(set(suits)) == 1
        seq, seq_tie = is_seq(vals)
        if len(counts) == 1:              # trail
            return (6, [sv[0]])
        if flush and seq:                 # pure sequence
            return (5, seq_tie)
        if seq:                           # sequence
            return (4, seq_tie)
        if flush:                         # flush
            return (3, sv)
        if len(counts) == 2:              # pair
            pair = sorted(counts, key=lambda k: (counts[k], k), reverse=True)[0]
            kicker = max(v for v in vals if v != pair)
            return (2, [pair, kicker])
        return (1, sv)                    # high card

    sa, sb = score(a), score(b)
    if sa[0] != sb[0]: return "A" if sa[0] > sb[0] else "B"
    tA, tB = sa[1], sb[1]
    for i in range(max(len(tA), len(tB))):
        va, vb = (tA[i] if i < len(tA) else 0), (tB[i] if i < len(tB) else 0)
        if va != vb: return "A" if va > vb else "B"
    return random.choice(["A", "B"])

# ─────────────────────────────────────────────
# Round ID sequence (DB-backed, atomic)
# ─────────────────────────────────────────────
def next_round_id() -> int:
    """
    Atomically increments and returns the round id counter.
    First time it’s created, it’s seeded to STARTING_ROUND_ID - 1.
    """
    with transaction.atomic():
        row, _ = (Counter.objects
                  .select_for_update()
                  .get_or_create(name="round_id",
                                 defaults={"value": STARTING_ROUND_ID - 1}))
        row.value = row.value + 1
        row.save(update_fields=["value"])
        return int(row.value)

# ─────────────────────────────────────────────
# Round persistence helpers
# ─────────────────────────────────────────────
def _ensure_round_from_engine(engine_obj: dict) -> Round:
    if not engine_obj:
        raise ValueError("Engine round not initialized")
    rid = str(engine_obj["round_id"])
    defaults = {
        "game": "tpt20",
        "started_at": ts_to_dt(engine_obj["start_time"]) if engine_obj.get("start_time") else None,
        "player_a_cards": engine_obj.get("player_a_full") or None,
        "player_b_cards": engine_obj.get("player_b_full") or None,
    }
    row, _ = Round.objects.get_or_create(round_id=rid, defaults=defaults)
    changed = False
    if defaults["started_at"] and not row.started_at:
        row.started_at = defaults["started_at"]; changed = True
    if defaults["player_a_cards"] and not row.player_a_cards:
        row.player_a_cards = defaults["player_a_cards"]; changed = True
    if defaults["player_b_cards"] and not row.player_b_cards:
        row.player_b_cards = defaults["player_b_cards"]; changed = True
    if changed:
        row.save(update_fields=["started_at", "player_a_cards", "player_b_cards"])
    return row

def _finalize_round(engine_finished: dict, end_time_ts: int) -> Round:
    rid = str(engine_finished["round_id"])
    winner = engine_finished["official_result"]
    ended_at = ts_to_dt(end_time_ts)

    round_row = _ensure_round_from_engine(engine_finished)
    updates = {}
    if not round_row.winner:   updates["winner"]  = winner
    if not round_row.ended_at: updates["ended_at"] = ended_at
    updates["resolver"] = "official"
    if updates:
        for k, v in updates.items(): setattr(round_row, k, v)
        round_row.save(update_fields=list(updates.keys()))
    return round_row

# ─────────────────────────────────────────────
# WS broadcaster (profile)
# ─────────────────────────────────────────────
def _broadcast_user_profile(user_id: int):
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return
    if u.is_superuser:
        data = {"balance": "∞", "expo": "∞", "is_admin": True}
    else:
        current_round_id = CURRENT_ROUND["round_id"] if CURRENT_ROUND else None
        expo = Bet.objects.filter(
            user_id=user_id, status="PLACED",
            round__round_id=str(current_round_id) if current_round_id else None,
        ).aggregate(total=Sum("stake"))["total"] or Decimal("0.00")
        data = {"balance": f"{u.balance:.2f}", "expo": f"{expo:.2f}", "is_admin": False}

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {"type": "profile_update", "data": data},
    )

# ─────────────────────────────────────────────
# Round lifecycle
# ─────────────────────────────────────────────
def new_round_state(now: int) -> dict:
    a, b = _deal_two_hands()
    winner = _compare_teen_patti(a, b)
    rid = next_round_id()  # ⬅️ sequential id from DB
    print(f"[engine] NEW ROUND rid={rid} | A=[{pretty(a)}] | B=[{pretty(b)}] | winner={winner}")
    return {
        "round_id": rid,
        "start_time": now,
        "player_a_full": a,
        "player_b_full": b,
        "official_result": winner,
        "skip_engine_feed": False,
    }

def calc_cycle(now: int):
    global CURRENT_ROUND
    if CURRENT_ROUND is None:
        CURRENT_ROUND = new_round_state(now)
    elapsed = now - CURRENT_ROUND["start_time"]
    sec = elapsed % CYCLE_SECONDS
    if sec < BET_SECONDS:
        return sec, "bet", BET_SECONDS - sec
    sec_in_reveal = sec - BET_SECONDS
    return sec, "reveal", max(0, REVEAL_SECONDS - sec_in_reveal)

def reveal_step(sec_in_cycle: int) -> int:
    if sec_in_cycle < BET_SECONDS:
        return 0
    sec_in_reveal = sec_in_cycle - BET_SECONDS
    step = int((sec_in_reveal / REVEAL_SECONDS) * 6) + 1
    return max(1, min(6, step))

def mask_cards_for_step(full_cards: List[str], step: int, player: str) -> List[str]:
    if step <= 0:
        return [FLIPPED, FLIPPED, FLIPPED]
    show = [False, False, False]
    if player == "A":
        show[0] = step >= 1; show[1] = step >= 3; show[2] = step >= 5
    else:
        show[0] = step >= 2; show[1] = step >= 4; show[2] = step >= 6
    return [full_cards[i] if show[i] else FLIPPED for i in range(3)]

# ─────────────────────────────────────────────
# Settlement (unchanged)
# ─────────────────────────────────────────────
def settle_round(round_row: Round):
    if not round_row or not round_row.winner:
        return
    winner = round_row.winner
    now = timezone.now()
    affected_users = set()
    with transaction.atomic():
        bets = (Bet.objects.select_for_update()
                .select_related("user")
                .filter(round=round_row, status="PLACED"))
        for bet in bets:
            user_id = bet.user_id
            affected_users.add(user_id)
            bet.settle(winner=winner, return_ratio=Decimal("1.96"))
            bet.settled_at = now
            bet.save(update_fields=["status", "payout", "net", "settled_at"])
            if bet.status == "WON" and bet.payout > 0:
                user = User.objects.select_for_update().get(id=user_id)
                prev_bal = user.balance
                user.balance = (prev_bal + bet.payout).quantize(Decimal("0.01"))
                user.save(update_fields=["balance"])
                print(f"[settle] ✅ {user.username} WON stake={bet.stake} payout={bet.payout}  {prev_bal} -> {user.balance}")
            else:
                print(f"[settle] ❌ {bet.user.username if bet.user_id else bet.id} LOST stake={bet.stake}")
    for uid in affected_users:
        _broadcast_user_profile(uid)

# ─────────────────────────────────────────────
# Engine loop
# ─────────────────────────────────────────────
def _engine_loop():
    global CURRENT_ROUND
    while True:
        time.sleep(0.5)
        now = int(time.time())
        finished = None
        with _LOCK:
            if CURRENT_ROUND is None:
                CURRENT_ROUND = new_round_state(now)
            else:
                elapsed = now - CURRENT_ROUND["start_time"]
                if elapsed >= CYCLE_SECONDS:
                    finished = {
                        "round_id": CURRENT_ROUND["round_id"],
                        "start_time": CURRENT_ROUND["start_time"],
                        "player_a_full": CURRENT_ROUND["player_a_full"],
                        "player_b_full": CURRENT_ROUND["player_b_full"],
                        "official_result": CURRENT_ROUND["official_result"],
                        "skip_engine_feed": CURRENT_ROUND.get("skip_engine_feed", False),
                    }
                    print(f"[engine] ROLLOVER from rid={finished['round_id']} -> creating next round...")
                    CURRENT_ROUND = new_round_state(now)
        if finished:
            rid = str(finished["round_id"])
            try:
                print(f"[engine] FINALIZE rid={rid} | official_result={finished['official_result']}")
                round_row = _finalize_round(finished, end_time_ts=now)
                if not finished.get("skip_engine_feed", False):
                    settle_round(round_row)
                print(f"[engine] SETTLED rid={rid}")
            except Exception as e:
                print(f"[engine] finalize/settle failed for round {rid}: {e}")

def start_engine():
    global _ENGINE_STARTED
    if _ENGINE_STARTED:
        print("[engine] background engine started (single)")
        return
    _ENGINE_STARTED = True
    threading.Thread(target=_engine_loop, name="engine-thread", daemon=True).start()
    print("[engine] background engine started")
