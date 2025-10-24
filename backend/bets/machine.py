from __future__ import annotations

import random
from dataclasses import dataclass, asdict
from decimal import Decimal
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

from django.utils import timezone
from django.db.models import Sum, Count, Case, When, Value, DecimalField, Avg
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth

from .models import Bet
from users.models import User

# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class BiasedDecision:
    use_biased: bool
    winner: Optional[str] = None        # "A" or "B"
    player_a_full: Optional[List[str]] = None
    player_b_full: Optional[List[str]] = None
    rule_id: Optional[str] = None        # which rule triggered
    note: Optional[str] = None          # human note for logs


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
    lifetime_wins: int
    lifetime_losses: int
    lifetime_settled: int
    lifetime_win_rate: float
    lifetime_net: Decimal
    cons_same_selection: int
    recent_big_wins: int
    after_consolation: int  # countdown after big consolation
    net_weekly: Decimal
    win_rate_weekly: float
    net_monthly: Decimal
    rolling_30d_avg_stake: Decimal
    hand_pattern_score: float  # 0-1, higher if repeating patterns

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
    "S1_FIRST_TIME_WIN": "first 5 bets: random 1-2 small wins, not consecutive",
    "S1_EARLY_HIGH_FORCE_LOSS": "first 3 bets & stake >200 → loss",
    "S2_BIG_FIRST_LOSS": "first bet today is big (>3000) → force a loss",
    "S3_SINGLE_PLAY_LOSS": "low bets today (<3) → close loss to encourage more",
    "S4_MULTI_CAP_25": "multiple bets (10+): cap at 25% win rate",
    "S4_NO_MORE_THAN_1W": "avoid more than 1 win in a row today",
    "S4_CONSOLATION_SMALL": "3+ cons losses & small stake → consolation small win",
    "S5_MORALE_AFTER_YDAY": "bad yesterday and first bet today → small morale win",
    "S5_RETURN_EASY_WIN": "returning after gap → 1 easy win in first 3",
    "S5_STREAK_FATIGUE": "long daily streak → bias subtle loss",
    "S6_PATTERN_RANDOM": "suspected pattern testing → randomize outcome",
    "S7_AFTER_BIG_WIN": "recent big win → reduce next wins",
    "S8_COOL_SUSPICION_SMALL_WIN": "7+ cons losses & small stake/below avg → small win (TIGHTENED)",
    "S9_REPEAT_SELECTION_LOSS": "consecutive same selection → rig loss",
    "S11_BIG_CONSOLATION": "big loss today (≤ -10,000) → one heavy consolation win",
    "S12_FATIGUE_MODE": "100+ matches today → fatigue mode loss",
    "S13_PUNISH_AFTER_1W": "any recent win → punish with heavy loss",
    "S15_AGGRESSIVE_LOSS": "aggressive bet (all-in/high) → loss unless late consolation",
    "GLOBAL_25_CAP": "projected lifetime/session win >25% → force loss",
    "GLOBAL_NO_PROFIT": "in profit today/lifetime → force loss to drain",
    "WEEKLY_CAP": "weekly net >0 or win rate >25% → force loss",
    "SPIKE_LOSS": "stake spike >1.5x rolling avg → force loss",
    "PATTERN_RIG": "high hand pattern repetition → rig loss",
    "TIGHT_DEFAULT_LOSS": "no rule → 95% house edge loss (TIGHTENED)",
    "DEFAULT_EDGE_ON_BIG_STAKE": "big stake vs average → house-edge loss",
    "NO_RULE": "no rule matched → follow official engine",

    # NEW S16–S21
    "S16_FREQUENT_SMALL_WINS": "3 of last 5 wins are small → reset trap",
    "S17_MICRO_PROFIT_LOOP": "net profit < ₹500 → force loss to drain",
    "S18_2W_IN_3": "2 wins in last 3 → force loss",
    "S19_SMART_STAKE_TRAP": "clever small stake → punish",
    "S20_QUICK_BACK_TO_BACK": "quick back-to-back bets → house defense",
    "S21_CASHOUT_TRAP": "low stake after big win → punish",
    # NEW FIXES
    "GLOBAL_HARD_PROFIT_DRAIN": "FINAL ABSOLUTE DRAIN: net profit > 0 (today or lifetime) → force loss (TOP PRIORITY)",
    "RIG_3W_IN_5_RECENT": "3+ wins in last 5 settled bets → force loss",
    "LOOP_MICRO_STAKE_DRAIN": "net profit > ₹300 AND small stake < ₹200 → force loss",
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
    selection: str,        # "A" or "B" (what the user picked)
    round_id: str,         # public round id (string)
) -> BiasedDecision:
    # 1) Stats & simple metrics (2 lines)
    stats = _collect_stats(user, selection)
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

def _collect_stats(user: User, selection: str) -> SessionStats:
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

    # Lifetime
    life_settled_q = Bet.objects.filter(user=user).exclude(status="PLACED")
    lifetime_wins = life_settled_q.filter(status="WON").count()
    lifetime_losses = life_settled_q.filter(status="LOST").count()
    lifetime_settled = lifetime_wins + lifetime_losses
    lifetime_win_rate = lifetime_wins / lifetime_settled if lifetime_settled > 0 else 0.0
    lifetime_net = life_settled_q.aggregate(s=Sum("net"))["s"] or Decimal("0")

    # Consecutive same selection (last 10 placed)
    cons_same_selection = 1
    prev_sel = selection
    for b in reversed(last20p[:10]):
        if hasattr(b, 'selection') and b.selection != prev_sel:
            break
        cons_same_selection += 1
    if cons_same_selection > 10:
        cons_same_selection = 10  # cap

    # Recent big wins (last 20, win with stake > avg*2)
    recent_big_wins = sum(1 for b in last20 if b.status == "WON" and b.stake > avg_stake_recent * 2)

    # After consolation (simple: if recent big win after big loss, assume consolation, countdown 5)
    # COOLDOWN IS STILL 5 FOR NOW, BUT THE CONSOLATION IS FOLLOWED BY OTHER RULES
    after_consolation = max(0, 5 - sum(1 for b in last20[:5] if b.status == "WON" and b.net > Decimal("1000")))

    # Weekly
    week_start = today_start - timedelta(weeks=1)
    week_q = Bet.objects.filter(user=user, settled_at__gte=week_start, settled_at__lt=today_start)
    net_weekly = week_q.aggregate(s=Sum("net"))["s"] or Decimal("0")
    week_settled = week_q.count()
    wins_weekly = week_q.filter(status="WON").count()
    win_rate_weekly = wins_weekly / week_settled if week_settled > 0 else 0.0

    # Monthly
    month_start = today_start.replace(day=1)
    month_q = Bet.objects.filter(user=user, settled_at__gte=month_start, settled_at__lt=today_start)
    net_monthly = month_q.aggregate(s=Sum("net"))["s"] or Decimal("0")

    # Rolling 30d avg stake
    d30_start = today_start - timedelta(days=30)
    d30_stakes_avg = Bet.objects.filter(user=user, created_at__gte=d30_start).aggregate(avg=Avg("stake"))["avg"]
    rolling_30d_avg_stake = Decimal(str(d30_stakes_avg)) if d30_stakes_avg else Decimal("0")

    # Simple hand pattern (mock: assume Bet has 'hand_type' field; else add)
    hand_pattern_score = min(cons_same_selection / 10.0, 1.0)

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
        lifetime_wins=lifetime_wins,
        lifetime_losses=lifetime_losses,
        lifetime_settled=lifetime_settled,
        lifetime_win_rate=lifetime_win_rate,
        lifetime_net=lifetime_net,
        cons_same_selection=cons_same_selection,
        recent_big_wins=recent_big_wins,
        after_consolation=after_consolation,
        net_weekly=net_weekly,
        win_rate_weekly=win_rate_weekly,
        net_monthly=net_monthly,
        rolling_30d_avg_stake=rolling_30d_avg_stake,
        hand_pattern_score=hand_pattern_score,
    )

def _consecutive_counters(bets: List[Bet]) -> Tuple[int, int]:
    cons_w = cons_l = 0
    for b in reversed(bets):  # reverse to start from most recent
        if b.status == "WON":
            cons_w += 1
            if cons_l > 0:
                break
        elif b.status == "LOST":
            cons_l += 1
            if cons_w > 0:
                break
    return cons_w, cons_l

# ──────────────────────────────────────────────────────────────────────────────
# Rule engine
# ──────────────────────────────────────────────────────────────────────────────

def _apply_rules(*, user: User, stake: Decimal, selection: str, stats: SessionStats):
    s = stats
    st = Decimal(stake)

    # 1. IMMEDIATE PROFIT DRAIN (✅ Fix A: Hard drain at the top)
    # The most aggressive rule to prevent sustained profit.
    if s.net_today > Decimal("0") or s.lifetime_net > Decimal("0"):
        return (False, "heavy", "GLOBAL_HARD_PROFIT_DRAIN")

    # Global caps second: enforce 25% win
    projected_session_rate = (s.wins_today + 1) / max(s.total_today + 1, 1)
    projected_lifetime_rate = (s.lifetime_wins + 1) / max(s.lifetime_settled + 1, 1)
    if projected_session_rate > 0.25 or projected_lifetime_rate > 0.25:
        return (False, "close" if random.random() < 0.5 else "heavy", "GLOBAL_25_CAP")

    # Weekly/Monthly caps
    if s.net_weekly > Decimal("0") or s.win_rate_weekly > 0.25:
        return (False, "heavy", "WEEKLY_CAP")

    # Spike loss
    if st > s.rolling_30d_avg_stake * Decimal("1.5"):
        return (False, "heavy", "SPIKE_LOSS")

    # Pattern rig
    if s.hand_pattern_score > 0.7:
        return (False, "close", "PATTERN_RIG")

    # Consolation Cooldown enforcement (no sympathy while this is active)
    if s.after_consolation > 0:
        return (False, "heavy", "S11_BIG_CONSOLATION")

    # 2. RECENT WIN STREAK PUNISHMENT (✅ Fix B: Win Streak Check)
    last5_settled = list(Bet.objects.filter(user=user).exclude(status="PLACED").order_by("-settled_at")[:5])
    recent_wins = sum(1 for b in last5_settled if b.status == "WON")
    if recent_wins >= 3:
        return (False, "heavy", "RIG_3W_IN_5_RECENT")

    # 3. MICRO PROFIT/SMALL STAKE LOOPHOLE (✅ Fix F: Micro Profit Cap)
    if s.net_today > Decimal("300") and st < Decimal("200"):
        return (False, "heavy", "LOOP_MICRO_STAKE_DRAIN")
    
    # Compute today_start for S1
    tz = timezone.get_current_timezone()
    today_start = timezone.now().astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)

    # S1: First Time Playing — first 5: 1-2 small wins random non-consec, >200 in first 3 → loss
    first5_bets = list(Bet.objects.filter(user=user, created_at__gte=today_start).order_by("created_at")[:5])
    first5_wins = sum(1 for b in first5_bets if b.status == "WON")
    if s.placed_today < 5:
        if first5_wins >= 2 or (s.cons_wins > 0 and random.random() < 0.8):  # limit to 1-2, avoid consec (TIGHTENED)
            return (False, "close", "S1_FIRST_TIME_WIN")  # force loss if already 2 or consec
        if s.placed_today < 3 and st > Decimal("200"):
            return (False, "heavy", "S1_EARLY_HIGH_FORCE_LOSS")
        if random.random() < 0.15 and first5_wins < 1:  # Reduced to 15% chance for win in first 5 (TIGHTENED)
            return (True, "small", "S1_FIRST_TIME_WIN")

    # S2: Starts Betting Big Early
    if s.placed_today == 0 and st > Decimal("3000"):
        return (False, "heavy", "S2_BIG_FIRST_LOSS")

    # S3: Playing Once & Leaving (low activity)
    if s.total_today < 3 and random.random() < 0.7: # Increased loss chance
        return (False, "close", "S3_SINGLE_PLAY_LOSS")

    # S11: Approaches 10,000 chip loss → consolation (Only if after_consolation is 0)
    if s.net_today <= Decimal("-10000") and s.after_consolation == 0:
        return (True, "heavy", "S11_BIG_CONSOLATION")
    # Note: the subsequent loss-forcing is now at the top of the function

    # S13: Wins Once in a Row → punish (tightened from >=2)
    if s.cons_wins >= 1:
        if random.random() < 0.95:  # 95% punish after any win (TIGHTENED)
            return (False, "heavy", "S13_PUNISH_AFTER_1W")

    # S7: After Big Win → reduce next 5
    if s.recent_big_wins >= 1 and random.random() < 0.1:  # even lower chance win after big
        return (False, "heavy", "S7_AFTER_BIG_WIN")

    # S8: CONSECUTIVE LOSSES (SYMPATHY RULE HARDENED) (✅ Fix D)
    # 7+ Consecutive Losses → small win only if stake is below 50% of average
    if s.cons_losses >= 7 and st < (s.avg_stake_recent * Decimal("0.50")):
        return (True, "small", "S8_COOL_SUSPICION_SMALL_WIN")

    # S4: Multiple Times a Day — cap 25%, no >1 row, consolation after 3+ losses small
    if s.total_today >= 10:
        if projected_session_rate > 0.25:
            return (False, "close", "S4_MULTI_CAP_25")
        if s.cons_wins >= 1:
            return (False, "close", "S4_NO_MORE_THAN_1W")
    # S4_CONSOLATION_SMALL also hardened
    if s.cons_losses >= 5 and st < Decimal("150"): # Increased loss count to 5 and reduced stake threshold
        return (True, "small", "S4_CONSOLATION_SMALL")

    # S5: Cross-day morale (sympathy rules remain for retention, but less common)
    if s.y_losses >= 5 and s.placed_today == 0: # Increased yesterday's loss requirement
        if random.random() < 0.7:
             return (True, "small", "S5_MORALE_AFTER_YDAY")
    if s.days_since_last_play >= 3 and s.placed_today < 3: # Increased day gap
        if random.random() < 0.6:
            return (True, "small", "S5_RETURN_EASY_WIN")
    if s.days_active_streak >= 3:
        if random.random() < 0.75: # Increased loss chance
            return (False, "close", "S5_STREAK_FATIGUE")

    # S12: >100 matches
    if s.total_today >= 100:
        return (False, "heavy", "S12_FATIGUE_MODE")

    # S9: Repeated Selection
    if s.cons_same_selection >= 3:
        return (False, "heavy", "S9_REPEAT_SELECTION_LOSS")

    # S6: Pattern Testing (randomize, occasional fake but no ties, just vary)
    if s.total_today % 25 == 0 and random.random() < 0.1:  # rare random
        return (random.choice([True, False]), "close", "S6_PATTERN_RANDOM")

    # S15: Aggressive Bet
    if st > s.max_stake_recent * Decimal("1.5") or st > Decimal("5000"):  # aggressive
        if s.net_today < Decimal("-5000") and s.cons_losses >= 5: # only a hopeful win after major loss and streak
            return (True, "small", "S15_AGGRESSIVE_LOSS")
        else:
            return (False, "heavy", "S15_AGGRESSIVE_LOSS")

    # ──────────────────────────────────────────────────────────────────────────
    # NEW RULES: S16–S21 (Tactical traps)
    # ──────────────────────────────────────────────────────────────────────────

    # Build recent windows needed (settled and placed)
    last20_settled = list(Bet.objects.filter(user=user).exclude(status="PLACED").order_by("-settled_at")[:20])

    # S16: Frequent Small Wins → Reset Trap
    recent5 = last20_settled[:5]
    recent_small_wins = [b for b in recent5 if b.status == "WON" and (b.net or Decimal("0")) < Decimal("500")]
    if len(recent_small_wins) >= 3:
        return (False, "close", "S16_FREQUENT_SMALL_WINS")

    # S17: Micro Profiter Loop
    if Decimal("0") < s.net_today < Decimal("500"):
        return (False, "heavy", "S17_MICRO_PROFIT_LOOP")

    # S18: 2 Win in 3 Attempts → Guaranteed Punish
    last3 = list(Bet.objects.filter(user=user).exclude(status="PLACED").order_by("-settled_at")[:3])
    if len([b for b in last3 if b.status == "WON"]) >= 2:
        return (False, "heavy", "S18_2W_IN_3")

    # S19: Smart Stake Trap
    if s.avg_stake_recent > 0:
        lower_bound = (s.avg_stake_recent * Decimal("0.75"))
        if st < s.avg_stake_recent and st > lower_bound:
            return (False, "close", "S19_SMART_STAKE_TRAP")

    # S20: Quick Back-to-Back Bets Trap
    recent_two = list(Bet.objects.filter(user=user).order_by("-created_at")[:2])
    if len(recent_two) == 2:
        delta = (recent_two[0].created_at - recent_two[1].created_at).total_seconds()
        if delta < 60:
            return (False, "heavy", "S20_QUICK_BACK_TO_BACK")

    # S21: Low Stake After High Win (Cashout Trap)
    if s.recent_big_wins >= 1 and st < s.avg_stake_recent * Decimal("0.5"): # Tightened stake factor
        return (False, "close", "S21_CASHOUT_TRAP")

    # ──────────────────────────────────────────────────────────────────────────
    # Defaults
    # ──────────────────────────────────────────────────────────────────────────

    # Default: house edge on big
    if st >= max(Decimal("1000"), s.avg_stake_recent * Decimal("1.5")):
        return (False, "close", "DEFAULT_EDGE_ON_BIG_STAKE")

    # Tight default: 95% loss if no rule (✅ Fix E: Increased House Edge)
    if random.random() < 0.95:
        return (False, "close", "TIGHT_DEFAULT_LOSS")

    # No rule (5% chance of engine win on default)
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
    user_side: str,      # "A" or "B"
    winner: str,         # "A" or "B"
    flavor: str,         # "small" | "close" | "heavy"
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

    # Enhanced variety: always shuffle suits randomly, vary templates if pattern suspected
    a_full = _shuffle_suits(a_full)
    b_full = _shuffle_suits(b_full)
    if stats.total_today % 5 == 0:  # occasional extra variety
        a_full = _vary_hand(a_full)
        b_full = _vary_hand(b_full)
    return a_full, b_full

def _shuffle_suits(hand: List[str]) -> List[str]:
    suits = ["H","D","S","C"]
    random.shuffle(suits)
    out = [f"{c[:-1]}{suits[i%4]}" for i, c in enumerate(hand)]
    if len(set(out)) < 3:  # avoid unintended matches
        out = _shuffle_suits(hand)  # retry
    return out

def _vary_hand(hand: List[str]) -> List[str]:
    # Slight variation: swap one card value occasionally
    if random.random() < 0.3:
        idx = random.randint(0, 2)
        values = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"]
        new_value = random.choice(values)
        suit = hand[idx][-1]
        hand[idx] = f"{new_value}{suit}"
    return hand