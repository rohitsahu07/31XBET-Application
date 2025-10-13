# bets/design.py
"""
Helpers & constants for Teen Patti T20.
This file must NOT define any Django models to avoid conflicts.
"""

import random
from collections import Counter

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
    # first 6 cards are unique by construction
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

    # Pure sequence (straight flush)
    if is_flush and seq:
        return (5, seq_tie)

    # Sequence (straight)
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
    """
    Return 'A' or 'B'. If perfectly tied, break ties randomly (engine-friendly).
    """
    ra = hand_rank(a_cards)
    rb = hand_rank(b_cards)
    if ra > rb:
        return "A"
    if rb > ra:
        return "B"
    # exact tie → random winner for engine consistency
    return random.choice(["A", "B"])

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
# Round timing constants (shared with engine)
# ============================================================

# New canonical names (match engine.py)
BET_SECONDS = 20
REVEAL_SECONDS = 10
CYCLE_SECONDS = BET_SECONDS + REVEAL_SECONDS  # 30s total

# Backward-compatible aliases (do not break older imports)
BET_WINDOW = BET_SECONDS     # 0–20s: bet
REVEAL_END = CYCLE_SECONDS   # 20–30s: reveal
CYCLE = CYCLE_SECONDS        # total cycle length

__all__ = [
    "SUITS", "RANKS", "RANK_VALUE", "FLIPPED",
    "build_deck", "draw_two_hands_unique", "parse_rank", "parse_suit",
    "values_desc", "is_sequence", "hand_rank", "compare_hands",
    "pretty", "rank_name",
    "BET_SECONDS", "REVEAL_SECONDS", "CYCLE_SECONDS",
    "BET_WINDOW", "REVEAL_END", "CYCLE",
]
