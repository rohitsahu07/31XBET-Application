# Betting App

A hierarchical betting app with Django backend and React frontend. Users: Super Admin > Master Admin > Admin > Client. Betting on cricket (live via API) and casino (simulated).

## Prerequisites (Windows)
1. Install Python 3.12: Download from https://www.python.org/downloads/. Add to PATH.
2. Install Node.js 20+: https://nodejs.org/en/download/. Add to PATH.
3. Install PostgreSQL 15+: https://www.postgresql.org/download/windows/. Use pgAdmin to create a DB named `betting_app` with user `postgres`, password `password`.
4. Install Redis: https://github.com/microsoftarchive/redis/releases. Run `redis-server.exe`.
5. Install Git: https://git-scm.com/download/win.
6. Get a free API key from https://cricketdata.org/.

## Setup
1. Clone or unzip to `betting-app`.
2. Backend:
   - `cd backend`
   - Create virtual env: `python -m venv venv`
   - Activate: `venv\Scripts\activate`
   - Install deps: `pip install -r requirements.txt`
   - Copy `.env.example` to `.env`, fill: `DATABASE_URL=postgres://postgres:password@localhost:5432/betting_app`, `CRICKET_API_KEY=your_key`
   - Migrate: `python manage.py migrate`
   - Create superuser: `python manage.py createsuperuser`
   - Run: `python manage.py runserver`
   - (Optional) Celery: `celery -A betting_app worker -l info`
3. Frontend:
   - `cd frontend`
   - Install: `npm install`
   - Run: `npm start`
4. Access: http://localhost:3000 (frontend), http://localhost:8000/api/ (backend).

## Features
- Login-only system.
- User hierarchy (Super Admin creates Master Admin, etc.).
- Coin grants between levels.
- Ledger for transaction history.
- Betting on cricket (live scores via cricketdata.org) and casino (simulated).

## Notes
- Optimize with Redis caching.
- Expand casino logic or add WebSockets for live updates as needed.