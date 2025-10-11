import os
import django
import random
from datetime import datetime, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'betting_app.settings')
django.setup()

from users.models import User
from bets.models import BetRecord

def seed_bet_records():
    user = User.objects.filter(is_superuser=False).first()
    if not user:
        print("❌ No user found! Please create a non-admin user first.")
        return

    print(f"✅ Seeding data for user: {user.username}")
    BetRecord.objects.all().delete()

    base_time = datetime.now()
    balance = Decimal("3000.00")

    for i in range(100):
        minutes_back = random.randint(1, 3000)
        dt = base_time - timedelta(minutes=minutes_back)
        credit = Decimal("0.00")
        debit = Decimal(random.choice(["100.00", "200.00", "300.00", "500.00"]))
        won = random.choice([True, False])

        if won:
            description = f"WON - Teen Patti T20 ({random.randint(100000000000000, 999999999999999)})"
            credit = Decimal(random.choice(["200.00", "400.00", "600.00", "1000.00"]))
            debit = Decimal("0.00")
        else:
            description = f"LOSS - Teen Patti T20 ({random.randint(100000000000000, 999999999999999)})"

        prev_balance = balance
        balance = balance + credit - debit

        BetRecord.objects.create(
            user=user,
            date_time=dt,
            description=description,
            prev_balance=prev_balance,
            credit=credit,
            debit=debit,
            balance=balance
        )

    print("✅ 100 random bet records created successfully!")

if __name__ == "__main__":
    seed_bet_records()
