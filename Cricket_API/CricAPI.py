import requests
from datetime import datetime, timezone, timedelta

API_KEY = "536767d8-12d5-4f10-93b8-8331300db647"
URL = f"https://api.cricapi.com/v1/currentMatches?apikey={API_KEY}&offset=0"

# Convert GMT → IST
def gmt_to_ist(gmt_str):
    dt = datetime.fromisoformat(gmt_str)
    ist = dt + timedelta(hours=5, minutes=30)
    return ist.strftime("%d-%m-%Y %H:%M:%S")

# Get today’s matches
def get_todays_matches():
    resp = requests.get(URL)
    if resp.status_code != 200:
        print("❌ API Error:", resp.text)
        return []

    data = resp.json().get("data", [])
    today = datetime.now().date()

    matches = []
    for match in data:
        try:
            match_date = datetime.fromisoformat(match["dateTimeGMT"]).date()
        except Exception:
            continue

        if match_date == today:
            matches.append(match)
    return matches

# Format display
def display_matches(matches):
    print(f"\n📌 Matches Today (IST) – Strict Allow List ({datetime.now().strftime('%d-%m-%Y')})")
    print("-" * 90)

    for m in matches:
        ist_time = gmt_to_ist(m["dateTimeGMT"])
        teams = f"{m['teams'][0]} vs {m['teams'][1]}"
        comp = m.get("name", "")
        status = m.get("status", "")
        
        if m.get("matchEnded"):
            match_status = "✅ Finished"
        elif m.get("matchStarted"):
            match_status = "🔴 Ongoing"
        else:
            match_status = "⏳ Upcoming"

        print(f"{ist_time}  —  {teams}  [{comp}]  {match_status}")
        
        # Print score if available
        scores = m.get("score", [])
        if scores:
            score_line = "   📊 "
            for s in scores:
                score_line += f"{s['inning']}: {s['r']}/{s['w']} ({s['o']})  |  "
            print(score_line.rstrip(" | "))
        print("-" * 90)

if __name__ == "__main__":
    todays_matches = get_todays_matches()
    display_matches(todays_matches)
