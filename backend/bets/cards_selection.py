import random
import os
import time

# =============================
# GLOBAL STATS
# =============================
balance = 5000
wins = 0
losses = 0
total_bet = 0
game_count = 0

# =============================
# ENGHINDI DECK SETUP
# =============================
ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'ekka', 'jack', 'queen', 'king']
suits = ['paan', 'chidi', 'heera', 'club']
deck = [f"{rank} {suit}" for rank in ranks for suit in suits]
rank_values = {rank: i for i, rank in enumerate(ranks, start=2)}

# =============================
# PICK USER HAND
# =============================
def pick_user_hand():
    return random.sample(deck, 3)

# =============================
# PICK OPPONENT HAND (slightly higher)
# =============================
def pick_opponent_hand(user_hand):
    user_ranks = sorted([rank_values[c.split()[0]] for c in user_hand])
    opponent_hand = []

    for r_val in user_ranks:
        new_rank_index = min(r_val - 1 + random.randint(1, 2), len(ranks)-1)
        rank = ranks[new_rank_index]
        suit = random.choice(suits)
        card = f"{rank} {suit}"
        while card in opponent_hand or card in user_hand:
            suit = random.choice(suits)
            card = f"{rank} {suit}"
        opponent_hand.append(card)
    return opponent_hand

# =============================
# DISPLAY CARDS SIDE BY SIDE
# =============================
def display_side_by_side(playerA, playerB):
    print("\nPlayer A             Player B")
    print("-------------------------------")
    for a, b in zip(playerA, playerB):
        print(f"{a:<20} {b:<20}")
    print("-------------------------------")

# =============================
# DETERMINE WINNER
# =============================
def determine_winner(user_choice):
    global game_count, balance, wins, losses
    game_count += 1

    if game_count % 4 == 0:
        rigged_winner = user_choice
    else:
        rigged_winner = 'A' if user_choice == 'B' else 'B'

    if user_choice == 'A':
        player_A_cards = pick_user_hand()
        player_B_cards = pick_opponent_hand(player_A_cards)
    else:
        player_B_cards = pick_user_hand()
        player_A_cards = pick_opponent_hand(player_B_cards)

    display_side_by_side(player_A_cards, player_B_cards)

    print(f"\nYour choice: Player {user_choice}")
    print(f"Winner: Player {rigged_winner}")
    if rigged_winner == user_choice:
        print("You won this round!")
        return True
    else:
        print("You lost this round!")
        return False

# =============================
# CLEAR SCREEN
# =============================
def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

# =============================
# MAIN GAME LOOP
# =============================
while True:
    clear_screen()
    print("========== TEEN PATTI ==========")
    print(f"Balance: {balance}  Wins: {wins}  Losses: {losses}  Total Bet: {total_bet}")
    print("================================\n")

    print("Place your bet:\n")
    user_choice = input("Bet on Player A or Player B (A/B) or Q to quit: ").upper()
    print("--------------------------------\n")

    if user_choice == 'Q':
        print("Game ended. Thank you for playing!")
        break
    if user_choice not in ['A', 'B']:
        print("Please enter A or B only.")
        time.sleep(1.5)
        continue

    try:
        bet = int(input("Enter your bet amount: "))
        if bet > balance:
            print("Insufficient balance!")
            time.sleep(1.5)
            continue
    except:
        print("Enter a valid number!")
        time.sleep(1.5)
        continue

    total_bet += bet
    balance -= bet

    if determine_winner(user_choice):
        wins += 1
        balance += bet * 2
    else:
        losses += 1

    print("\nPress Enter to continue...")
    input()