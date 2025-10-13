from __future__ import annotations
import random, threading, time
from typing import List, Optional, Tuple
from datetime import datetime
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import RoundFeed
from bets.models import BetRecord
from users.models import User
from ledger.models import Transaction

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
    rval = {r:i+2 for i,r in enumerate(ranks)}
    def pr(c): return c.split(" of ")[0]
    def ps(c): return c.split(" of ")[1]

    def is_seq(vals):
        v = sorted(vals)
        if len(set(v)) != 3:
            return False,[]
        if v == [2,3,14]:
            return True,[3,2,1]
        ok = v[0]+1==v[1] and v[1]+1==v[2]
        return ok, sorted(vals, reverse=True)

    def score(cards):
        vals = [rval[pr(c)] for c in cards]
        suits = [ps(c) for c in cards]
        sv = sorted(vals, reverse=True)
        counts = {}
        for v in vals: counts[v] = counts.get(v,0)+1
        flush = len(set(suits)) == 1
        seq, seq_tie = is_seq(vals)
        if len(counts) == 1: return (6,[sv[0]])        
        if flush and seq:    return (5,seq_tie)
        if seq:              return (4,seq_tie)
        if flush:            return (3,sv)
        if len(counts) == 2:
            pair = sorted(counts, key=lambda k:(counts[k],k), reverse=True)[0]
            kicker = max(v for v in vals if v != pair)
            return (2,[pair,kicker])
        return (1,sv)

    sa, sb = score(a), score(b)
    if sa[0] != sb[0]:
        return "A" if sa[0] > sb[0] else "B"
    tA, tB = sa[1], sb[1]
    for i in range(max(len(tA),len(tB))):
        va = tA[i] if i < len(tA) else 0
        vb = tB[i] if i < len(tB) else 0
        if va != vb: return "A" if va > vb else "B"
    return random.choice(["A","B"])

# ─────────────────────────────────────────────
# Round lifecycle
# ─────────────────────────────────────────────
def new_round_state(now: int) -> dict:
    a = _deal_hand()
    b = _deal_hand()
    winner = _compare_teen_patti(a,b)
    rid = random.randint(10**14, 10**15-1)
    print(f"[new-round] id={rid} start={now} A={pretty(a)}  B={pretty(b)}  winner={winner}")
    return {
        "round_id": rid,
        "start_time": now,
        "player_a_full": a,
        "player_b_full": b,
        "official_result": winner,
        "skip_engine_feed": False,
    }

def calc_cycle(now: int) -> Tuple[int,str,int]:
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
    if sec_in_cycle < BET_SECONDS: return 0
    sec_in_reveal = sec_in_cycle - BET_SECONDS
    step = int((sec_in_reveal/REVEAL_SECONDS)*6)+1
    return max(1, min(6, step))

def mask_cards_for_step(full_cards: List[str], step: int, player: str) -> List[str]:
    if step <= 0: return [FLIPPED,FLIPPED,FLIPPED]
    show = [False,False,False]
    if player=="A":
        show[0]=step>=1; show[1]=step>=3; show[2]=step>=5
    else:
        show[0]=step>=2; show[1]=step>=4; show[2]=step>=6
    return [full_cards[i] if show[i] else FLIPPED for i in range(3)]

# ─────────────────────────────────────────────
# Feed persistence
# ─────────────────────────────────────────────
def _trim_feed(limit: int = 10):
    ids = list(RoundFeed.objects.order_by("-created_at").values_list("id", flat=True)[:limit])
    if ids:
        RoundFeed.objects.exclude(id__in=ids).delete()

def persist_engine_item(round_snapshot: dict, end_time_ts: int):
    with transaction.atomic():
        RoundFeed.objects.create(
            item_type="Engine Final",
            round_id=round_snapshot["round_id"],
            start_time=ts_to_dt(round_snapshot["start_time"]),
            end_time=ts_to_dt(end_time_ts),
            player_a_cards=round_snapshot["player_a_full"],
            player_b_cards=round_snapshot["player_b_full"],
            official_winner=round_snapshot["official_result"],
            final_result=round_snapshot["official_result"],
            resolver="engine",
        )
        _trim_feed(10)

# ─────────────────────────────────────────────
# Round settlement logic
# ─────────────────────────────────────────────
def settle_round(round_id: str, winner: str):
    """Settle all bets for this round"""
    print(f"[settle_round] Settling round {round_id} (winner={winner})")
    bets = BetRecord.objects.filter(round_id=round_id)
    for bet in bets:
        user = bet.user
        if not user:
            continue

        win = bet.player == winner
        with transaction.atomic():
            prev_bal = user.balance
            if win:
                payout = bet.amount * Decimal("1.96")
                new_bal = prev_bal + payout
                user.balance = new_bal
                user.save(update_fields=["balance"])
                Transaction.objects.create(
                    from_user=None,
                    to_user=user,
                    amount=payout,
                    type="win",
                    description=f"Won round {round_id} on Player {bet.player}",
                    prev_balance=prev_bal,
                    credit=payout,
                    debit=Decimal("0.00"),
                    balance=new_bal,
                )
                print(f"[settle_round] ✅ {user.username} won +{payout}")
            else:
                Transaction.objects.create(
                    from_user=None,
                    to_user=user,
                    amount=bet.amount,
                    type="loss",
                    description=f"Lost round {round_id} on Player {bet.player}",
                    prev_balance=prev_bal,
                    credit=Decimal("0.00"),
                    debit=Decimal("0.00"),
                    balance=prev_bal,
                )
                print(f"[settle_round] ❌ {user.username} lost {bet.amount}")
    print(f"[settle_round] Round {round_id} settled.")

# ─────────────────────────────────────────────
# Engine loop
# ─────────────────────────────────────────────
def _engine_loop():
    global CURRENT_ROUND
    while True:
        time.sleep(0.5)
        now = int(time.time())
        to_persist = None
        with _LOCK:
            if CURRENT_ROUND is None:
                CURRENT_ROUND = new_round_state(now)
                continue
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
                CURRENT_ROUND = new_round_state(now)
                if not finished["skip_engine_feed"]:
                    to_persist = finished
                    settle_round(finished["round_id"], finished["official_result"])
        if to_persist:
            try:
                persist_engine_item(to_persist, end_time_ts=now)
            except Exception as e:
                print(f"[engine] persist ENGINE item failed: {e}")

def start_engine():
    global _ENGINE_STARTED
    if _ENGINE_STARTED:
        print("[engine] background engine started (single)")
        return
    _ENGINE_STARTED = True
    threading.Thread(target=_engine_loop, name="engine-thread", daemon=True).start()
    print("[engine] background engine started")
