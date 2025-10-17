# backend/bets/engine.py

from __future__ import annotations
import random, threading, time
from typing import List, Optional, Tuple
from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.db.models import Sum  # ✅ for expo aggregation

from channels.layers import get_channel_layer  # ✅ WS broadcast
from asgiref.sync import async_to_sync         # ✅ WS broadcast

from .models import Round, Bet
from users.models import User
# from ledger.models import Transaction  # not used for game settlement anymore

# ─────────────────────────────────────────────
# Globals
# ─────────────────────────────────────────────
_LOCK = threading.RLock()
FLIPPED = "flipped_card"
BET_SECONDS = 20
REVEAL_SECONDS = 10
CYCLE_SECONDS = BET_SECONDS + REVEAL_SECONDS
CURRENT_ROUND: Optional[dict] = None
_ENGINE_STARTED = False

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
# Cards / ranking logic
# ─────────────────────────────────────────────
def _new_card() -> str:
    ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]
    suits = ["Hearts","Diamonds","Clubs","Spades"]
    return f"{random.choice(ranks)} of {random.choice(suits)}"

def _deal_hand() -> List[str]:
    return [_new_card(), _new_card(), _new_card()]

def pretty(cards: List[str]) -> str:
    return ", ".join(cards)

def _compare_teen_patti(a: List[str], b: List[str]) -> str:
    ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]
    rval = {r: i + 2 for i, r in enumerate(ranks)}

    def pr(c): return c.split(" of ")[0]
    def ps(c): return c.split(" of ")[1]

    def is_seq(vals):
        v = sorted(vals)
        if len(set(v)) != 3:
            return False, []
        # A-2-3 case
        if v == [2, 3, 14]:
            return True, [3, 2, 1]
        ok = v[0] + 1 == v[1] and v[1] + 1 == v[2]
        return ok, sorted(vals, reverse=True)

    def score(cards):
        vals = [rval[pr(c)] for c in cards]
        suits = [ps(c) for c in cards]
        sv = sorted(vals, reverse=True)
        counts = {}
        for v in vals:
            counts[v] = counts.get(v, 0) + 1
        flush = len(set(suits)) == 1
        seq, seq_tie = is_seq(vals)
        if len(counts) == 1:
            return (6, [sv[0]])         # trail
        if flush and seq:
            return (5, seq_tie)         # pure sequence
        if seq:
            return (4, seq_tie)         # sequence
        if flush:
            return (3, sv)              # flush
        if len(counts) == 2:            # pair
            pair = sorted(counts, key=lambda k: (counts[k], k), reverse=True)[0]
            kicker = max(v for v in vals if v != pair)
            return (2, [pair, kicker])
        return (1, sv)                   # high card

    sa, sb = score(a), score(b)
    if sa[0] != sb[0]:
        return "A" if sa[0] > sb[0] else "B"
    tA, tB = sa[1], sb[1]
    for i in range(max(len(tA), len(tB))):
        va = tA[i] if i < len(tA) else 0
        vb = tB[i] if i < len(tB) else 0
        if va != vb:
            return "A" if va > vb else "B"
    return random.choice(["A", "B"])

# ─────────────────────────────────────────────
# Round persistence helpers
# ─────────────────────────────────────────────
def _ensure_round_from_engine(engine_obj: dict) -> Round:
    """
    Ensure a Round row exists for engine's CURRENT_ROUND snapshot.
    Non-destructive sync: we only fill missing fields.
    """
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
    """
    Persist engine final to Round: set winner, ended_at, resolver.
    """
    rid = str(engine_finished["round_id"])
    winner = engine_finished["official_result"]
    ended_at = ts_to_dt(end_time_ts)

    round_row = _ensure_round_from_engine(engine_finished)
    updates = {}
    if not round_row.winner:
        updates["winner"] = winner
    if not round_row.ended_at:
        updates["ended_at"] = ended_at
    updates["resolver"] = "official"
    if updates:
        for k, v in updates.items():
            setattr(round_row, k, v)
        round_row.save(update_fields=list(updates.keys()))
    return round_row

# ─────────────────────────────────────────────
# Local WS broadcaster (avoid circular import with views)
# ─────────────────────────────────────────────
def _broadcast_user_profile(user_id: int):
    """
    Compute balance + expo (expo = current round PLACED stakes) and
    send a 'profile_update' to WS group user_<id>.
    """
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    if u.is_superuser:
        data = {"balance": "∞", "expo": "∞", "is_admin": True}
    else:
        global CURRENT_ROUND
        current_round_id = CURRENT_ROUND["round_id"] if CURRENT_ROUND else None
        expo_qs = Bet.objects.filter(
            user_id=user_id,
            status="PLACED",
            round__round_id=str(current_round_id) if current_round_id else None,
        )
        expo = expo_qs.aggregate(total=Sum("stake"))["total"] or Decimal("0.00")
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
    a = _deal_hand()
    b = _deal_hand()
    winner = _compare_teen_patti(a, b)
    rid = random.randint(10**14, 10**15 - 1)
    return {
        "round_id": rid,
        "start_time": now,
        "player_a_full": a,
        "player_b_full": b,
        "official_result": winner,
        "skip_engine_feed": False,
    }

def calc_cycle(now: int) -> Tuple[int, str, int]:
    global CURRENT_ROUND
    if CURRENT_ROUND is None:
        CURRENT_ROUND = new_round_state(now)
    elapsed = now - CURRENT_ROUND["start_time"]
    sec = elapsed % CYCLE_SECONDS
    if sec < BET_SECONDS:
        return sec, "bet", BET_SECONDS - sec
    else:
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
# Round settlement logic (NO ledger Transaction creation)
# ─────────────────────────────────────────────
def settle_round(round_row: Round):
    """
    Settle all PLACED bets for this round:

    - Update Bet.status/payout/net/settled_at using Bet.settle()
    - Credit user.balance ONLY for WON bets (no ledger Transaction rows)
    - Broadcast profile updates for all affected users (winners and losers)
    """
    if not round_row or not round_row.winner:
        return

    winner = round_row.winner
    now = timezone.now()
    affected_users = set()

    # IMPORTANT: build/select-for-update *inside* the atomic block
    with transaction.atomic():
        bets = (
            Bet.objects
            .select_for_update()
            .select_related("user")   # ↓ avoid refetch per row
            .filter(round=round_row, status="PLACED")
        )

        for bet in bets:
            user_id = bet.user_id
            affected_users.add(user_id)

            # compute settlement on the bet row
            bet.settle(winner=winner, return_ratio=Decimal("1.96"))
            bet.settled_at = now
            bet.save(update_fields=["status", "payout", "net", "settled_at"])

            # Credit only winners (keep this block EXACTLY as requested; with visible logs)
            if bet.status == "WON" and bet.payout > 0:
                # Lock and fetch user row to avoid race on multiple wins
                user = (
                    User.objects
                    .select_for_update()
                    .get(id=user_id)
                )
                prev_bal = user.balance
                # REQUIRED exact math + quantize
                user.balance = (prev_bal + bet.payout).quantize(Decimal("0.01"))
                user.save(update_fields=["balance"])

                # 🔎 Temporary debug logs (remove later)
                print(
                    f"[settle] ✅ {user.username} WON "
                    f"stake={bet.stake} payout={bet.payout}  {prev_bal} -> {user.balance}"
                )
            else:
                # 🔎 Temporary debug log for losses / zero-payout
                try:
                    uname = bet.user.username  # select_related("user") already in qs
                except Exception:
                    uname = f"id={user_id}"
                print(f"[settle] ❌ {uname} LOST stake={bet.stake}")

    # Notify (WS) once we're out of the DB transaction
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

        finished = None  # ✅ guard so we only use it if a rollover happened

        with _LOCK:
            if CURRENT_ROUND is None:
                CURRENT_ROUND = new_round_state(now)
            else:
                elapsed = now - CURRENT_ROUND["start_time"]
                if elapsed >= CYCLE_SECONDS:
                    # snapshot old round and start a new one
                    finished = {
                        "round_id": CURRENT_ROUND["round_id"],
                        "start_time": CURRENT_ROUND["start_time"],
                        "player_a_full": CURRENT_ROUND["player_a_full"],
                        "player_b_full": CURRENT_ROUND["player_b_full"],
                        "official_result": CURRENT_ROUND["official_result"],
                        "skip_engine_feed": CURRENT_ROUND.get("skip_engine_feed", False),
                    }
                    CURRENT_ROUND = new_round_state(now)

        # ✅ Only finalize/settle if we actually rolled over
        if finished:
            rid = str(finished["round_id"])
            try:
                round_row = _finalize_round(finished, end_time_ts=now)
                if not finished.get("skip_engine_feed", False):
                    settle_round(round_row)
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
