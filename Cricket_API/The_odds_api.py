import requests
from datetime import datetime, timedelta, timezone

API_KEY = 'ac4aaa5f18b07bb377b844007e895c5f'

# Get all cricket sport keys
def get_cricket_sports():
    url = f'https://api.the-odds-api.com/v4/sports/?apiKey={API_KEY}'
    response = requests.get(url)
    if response.status_code != 200:
        print(f"❌ Error fetching sports: {response.text}")
        return []
    sports = response.json()
    return [s['key'] for s in sports if s['active'] and 'cricket' in s['key'].lower()]

# Get odds/events for each cricket sport
def get_cricket_odds(sport_key):
    url = f'https://api.the-odds-api.com/v4/sports/{sport_key}/odds/?apiKey={API_KEY}&regions=us,uk&markets=h2h&oddsFormat=decimal'
    response = requests.get(url)
    if response.status_code != 200:
        print(f"❌ Error fetching odds for {sport_key}: {response.text}")
        return []
    return response.json()

# Filter only today’s matches
def filter_todays_matches(events):
    today = datetime.now(timezone.utc).date()
    todays_matches = []
    for event in events:
        event_time = datetime.fromisoformat(event['commence_time'].replace('Z', '+00:00'))
        if event_time.date() == today:
            todays_matches.append(event)
    return todays_matches

# Format and display matches
def display_matches(matches, sport_name):
    if not matches:
        return
    
    for event in matches:
        event_time = datetime.fromisoformat(event['commence_time'].replace('Z', '+00:00'))
        ist_time = event_time.astimezone(timezone(timedelta(hours=5, minutes=30)))
        
        home = event['home_team']
        away = event['away_team']
        bookmakers = event.get('bookmakers', [])

        status = "⏳ Upcoming"
        if event_time < datetime.now(timezone.utc):
            status = "🔴 Live / Finished"

        print(f"{ist_time.strftime('%d-%m-%Y %H:%M:%S')}  —  {home} vs {away}  [{sport_name}]  {status}")
        
        # Odds (averaged if multiple bookmakers exist)
        if bookmakers:
            try:
                home_odds = sum(bm['markets'][0]['outcomes'][0]['price'] for bm in bookmakers if bm['markets']) / len(bookmakers)
                away_odds = sum(bm['markets'][0]['outcomes'][1]['price'] for bm in bookmakers if bm['markets']) / len(bookmakers)
                print(f"   📊 Home odds: {home_odds:.2f}  |  Away odds: {away_odds:.2f}")
            except Exception:
                pass
        print("-" * 90)

# Main
if __name__ == "__main__":
    cricket_sports = get_cricket_sports()
    print(f"\n📌 Matches Today (IST) – Strict Allow List ({datetime.now().strftime('%d-%m-%Y')})")
    print("-" * 90)

    for sport in cricket_sports:
        events = get_cricket_odds(sport)
        todays = filter_todays_matches(events)
        display_matches(todays, sport)
