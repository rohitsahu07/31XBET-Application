import time
import random
from decimal import Decimal
from collections import Counter

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BetRecord
from .serializers import BetRecordSerializer

# ============================================================
# Standard deck + Teen Patti evaluation helpers
# ============================================================

SUITS = ["Hearts", "Spades", "Diamonds", "Clubs"]
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
RANK_VALUE = {r: i for i, r in enumerate(RANKS, start=2)}  # 2..14 (A=14)
FLIPPED = "flipped_card"


def build_deck():
    # "J of Spades", "6 of Hearts", "A of Diamonds"
    return [f"{r} of {s}" for s in SUITS for r in RANKS]


def draw_two_hands_unique():
    deck = build_deck()
    random.shuffle(deck)
    a = deck[:3]
    b = deck[3:6]
    return a, b


def parse_rank(card: str) -> str:
    return card.split(" of ")[0]


def parse_suit(card: str) -> str:
    return card.split(" of ")[1]


def values_desc(cards):
    return sorted((RANK_VALUE[parse_rank(c)] for c in cards), reverse=True)


def is_sequence(values):
    """
    Teen Patti straight:
      - Standard consecutive (e.g., K-Q-J)
      - A-2-3 allowed (A counted low for this case)
    """
    v = sorted(values)
    # A-2-3 special
    if set(v) == {14, 2, 3}:
        return True, [3, 2, 1]  # minimal straight for tie-breaking
    # Standard consecutive
    ok = (v[0] + 1 == v[1] and v[1] + 1 == v[2])
    return ok, sorted(values, reverse=True)


def hand_rank(cards):
    """
    Comparable tuple (category, tiebreakers), higher is better.
    Categories:
      6: Trail (Three of a kind)
      5: Pure Sequence (Straight Flush)
      4: Sequence (Straight)
      3: Color (Flush)
      2: Pair
      1: High Card
    """
    vals = [RANK_VALUE[parse_rank(c)] for c in cards]
    suits = [parse_suit(c) for c in cards]
    vals_sorted = sorted(vals, reverse=True)
    cnt = Counter(vals)
    is_flush = len(set(suits)) == 1
    seq, seq_tie = is_sequence(vals)

    # Trail
    if len(cnt) == 1:
        return (6, [vals_sorted[0]])

    # Pure sequence
    if is_flush and seq:
        return (5, seq_tie)

    # Sequence
    if seq:
        return (4, seq_tie)

    # Color (flush)
    if is_flush:
        return (3, vals_sorted)

    # Pair
    if len(cnt) == 2:
        pair_val = max(cnt, key=lambda k: (cnt[k], k))
        kicker = max(v for v in vals if v != pair_val)
        return (2, [pair_val, kicker])

    # High card
    return (1, vals_sorted)


def compare_hands(a_cards, b_cards):
    ra = hand_rank(a_cards)
    rb = hand_rank(b_cards)
    if ra > rb:
        return "A"
    if rb > ra:
        return "B"
    return "Tie"


# Pretty-print helpers for console
def pretty(cards):
    if cards is None:
        return "-"
    return ", ".join(cards)


def rank_name(rank_tuple):
    mapping = {
        6: "Trail",
        5: "Pure Sequence",
        4: "Sequence",
        3: "Color",
        2: "Pair",
        1: "High Card",
    }
    return mapping.get(rank_tuple[0], "?")


# ============================================================
# Round engine state + timing
# ============================================================

BET_WINDOW = 20   # 0–20s: bet
REVEAL_END = 30   # 20–30s: reveal
CYCLE = 30        # total cycle length


def new_round_state(now: int):
    a, b = draw_two_hands_unique()
    official = compare_hands(a, b)

    # avoid Tie to keep UX simple (retry a few times)
    tries = 0
    while official == "Tie" and tries < 5:
        a, b = draw_two_hands_unique()
        official = compare_hands(a, b)
        tries += 1

    state = {
        "round_start_time": now,
        "round_id": random.randint(10**14, 10**15 - 1),
        "player_a_full": a,
        "player_b_full": b,
        "official_result": official,  # "A" or "B"
    }

    # Minimal, single-line log
    ra = hand_rank(a)
    rb = hand_rank(b)

    def _rname(rt):
        return {6: "Trail", 5: "PureSeq", 4: "Seq", 3: "Flush", 2: "Pair", 1: "High"}[rt[0]]

    print(
        f"[new-round] id={state['round_id']} start={now} "
        f"A={', '.join(a)} ({_rname(ra)})  "
        f"B={', '.join(b)} ({_rname(rb)})  "
        f"winner={official}"
    )

    return state


# Lazy-initialized; do NOT touch until a request comes in
CURRENT_ROUND = None


def calc_cycle(now: int):
    elapsed = now - CURRENT_ROUND["round_start_time"]
    sec = elapsed % CYCLE
    if sec < BET_WINDOW:
        phase = "bet"
        seconds_left = BET_WINDOW - sec
    else:
        phase = "reveal"
        seconds_left = REVEAL_END - sec
    return sec, phase, seconds_left


def reveal_step(seconds_into_cycle: int):
    """
    20–30s mapped to 6 steps:
      1: A0, 2: B0, 3: A1, 4: B1, 5: A2, 6: B2
    """
    if seconds_into_cycle < BET_WINDOW:
        return 0
    t = seconds_into_cycle - BET_WINDOW  # 0..10
    step = int((t / 10.0) * 6) + 1
    return max(1, min(step, 6))


def mask_cards_for_step(cards, step, player: str):
    show = [False, False, False]
    if player == "A":
        show[0] = step >= 1
        show[1] = step >= 3
        show[2] = step >= 5
    else:
        show[0] = step >= 2
        show[1] = step >= 4
        show[2] = step >= 6
    return [cards[i] if show[i] else FLIPPED for i in range(3)]


def maybe_roll_new_round(now: int):
    """Advance to a new round only exactly at the 30s boundary."""
    global CURRENT_ROUND
    if CURRENT_ROUND is None:
        return  # not started yet
    elapsed = now - CURRENT_ROUND["round_start_time"]
    if elapsed > 0 and (elapsed % CYCLE == 0):
        CURRENT_ROUND.update(new_round_state(now))


# ============================================================
# Existing CRUD ViewSet (kept for your router)
# ============================================================

class BetRecordViewSet(viewsets.ModelViewSet):
    serializer_class = BetRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            user_id = self.request.query_params.get("user_id")
            if user_id:
                return BetRecord.objects.filter(user_id=user_id).order_by("-date_time")
            return BetRecord.objects.all().order_by("-date_time")
        return BetRecord.objects.filter(user=user).order_by("-date_time")

    def perform_create(self, serializer):
        user = self.request.user
        amount = self.request.data.get("amount")
        if not amount:
            raise ValueError("Amount is required.")
        amount = Decimal(str(amount))
        prev_balance = user.balance
        if user.balance < amount:
            raise ValueError("Insufficient balance.")

        outcome = random.choice(["won", "lost"])
        credit = debit = Decimal("0.00")
        new_balance = prev_balance
        if outcome == "won":
            credit = amount * Decimal("2")
            new_balance = prev_balance + credit
            desc = f"WON - Teen Patti T20 ({random.randint(10**14, 10**15 - 1)})"
        else:
            debit = amount
            new_balance = prev_balance - debit
            desc = f"LOSS - Teen Patti T20 ({random.randint(10**14, 10**15 - 1)})"

        with transaction.atomic():
            user.balance = new_balance
            user.save()
            serializer.save(
                user=user,
                description=desc,
                prev_balance=prev_balance,
                credit=credit,
                debit=debit,
                balance=new_balance,
                status=outcome,
            )


# ============================================================
# MACHINE 1: /api/bets/current-round/
# ============================================================

@api_view(["GET"])
def current_round(request):
    now = int(time.time())

    # Lazy init BEFORE any use
    global CURRENT_ROUND
    if CURRENT_ROUND is None:
        CURRENT_ROUND = new_round_state(now)

    # Maybe roll to a new round at the exact boundary
    maybe_roll_new_round(now)

    # Compute phase/step for the (possibly new) round
    sec, phase, seconds_left = calc_cycle(now)
    step = reveal_step(sec)

    if phase == "bet":
        a_cards = [FLIPPED, FLIPPED, FLIPPED]
        b_cards = [FLIPPED, FLIPPED, FLIPPED]
        result = None
    else:
        a_cards = mask_cards_for_step(CURRENT_ROUND["player_a_full"], step, "A")
        b_cards = mask_cards_for_step(CURRENT_ROUND["player_b_full"], step, "B")
        result = CURRENT_ROUND["official_result"] if step == 6 else None

    payload = {
        "round_id": CURRENT_ROUND["round_id"],
        "player_a_cards": a_cards,
        "player_b_cards": b_cards,
        "result": result,             # None until end of reveal (step 6)
        "phase": phase,               # "bet" | "reveal"
        "seconds_left": seconds_left, # remaining in current phase

        # Optional helpers for frontend reveal without polling
        "reveal_step": step,  # 1..6 during reveal, 0 during bet
        "player_a_full": CURRENT_ROUND["player_a_full"] if phase == "reveal" else None,
        "player_b_full": CURRENT_ROUND["player_b_full"] if phase == "reveal" else None,
    }

    # Console trace for debugging
    print(
        f"[current-round] phase={phase:<6} sec={sec:>2} step={step} "
        f"left={seconds_left:>2}s  round={payload['round_id']}  "
        f"A={pretty(a_cards)}  B={pretty(b_cards)}  result={result}"
    )

    return Response(payload, status=status.HTTP_200_OK)


# ============================================================
# MACHINE 2: /api/bets/place-bet/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def place_bet(request):
    """
    Resolver:
      - 0–20s (bet): *biased* against chosen side (≈70% lose).
      - 20–30s (reveal): returns the *official* round result.
    No DB write here; this is the outcome API.
    """
    try:
        round_id = request.data.get("round_id")
        player = request.data.get("player")  # "A" or "B"
        amount = request.data.get("amount")

        if not all([round_id, player, amount]):
            return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

        now = int(time.time())

        # Ensure engine exists BEFORE any cycle math
        global CURRENT_ROUND
        if CURRENT_ROUND is None:
            CURRENT_ROUND = new_round_state(now)

        maybe_roll_new_round(now)
        sec, phase, _ = calc_cycle(now)

        if phase == "bet":
            # Biased machine: bettor loses more often
            if player == "A":
                result = random.choices(["A", "B"], weights=[3, 7])[0]
            else:
                result = random.choices(["A", "B"], weights=[7, 3])[0]
            used = "biased"
            a_cards = None
            b_cards = None
        else:
            result = CURRENT_ROUND["official_result"]
            used = "official"
            a_cards = CURRENT_ROUND["player_a_full"]
            b_cards = CURRENT_ROUND["player_b_full"]

        print(
            f"[place-bet] phase={phase:<6} sec={sec:>2} chose={player} amt={amount} "
            f"resolver={used:<8} -> result={result}  round={round_id}  "
            f"A_full={pretty(CURRENT_ROUND['player_a_full'])}  "
            f"B_full={pretty(CURRENT_ROUND['player_b_full'])}"
        )

        return Response(
            {
                "message": "Bet placed successfully",
                "round_id": round_id,
                "player": player,
                "bet_amount": amount,
                "phase": phase,
                "resolver": used,
                "final_result": result,
                "server_time": now,
                "player_a_cards": a_cards,  # only non-null during reveal
                "player_b_cards": b_cards,  # only non-null during reveal
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        print(f"[place-bet] ERROR: {e}")
        return Response({"error": "Server error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
