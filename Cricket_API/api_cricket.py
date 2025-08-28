import requests
from datetime import datetime, timedelta, timezone

# ✅ Use API v2 URL
API_URL = "https://apiv2.api-cricket.com/cricket/"
API_KEY = "9251f4c3244e73d7b1ebcdad247b1b394007dc193b92dea0e84fee7c7f969263"

def get_today_matches():
    now_utc = datetime.now(timezone.utc)
    today_ist = now_utc.astimezone(timezone(timedelta(hours=5, minutes=30)))
    today_str = today_ist.strftime("%Y-%m-%d")  # Format yyyy-mm-dd

    params = {
        "method": "get_events",
        "APIkey": API_KEY,
        "date_start": today_str,
        "date_stop": today_str
    }

    response = requests.get(API_URL, params=params)
    data = response.json()

    if not data.get("success"):
        print(f"❌ API error: {data}")
        return []

    matches_today = []
    for match in data.get("result", []):
        try:
            event_time = match.get("event_time", "00:00")
            match_datetime_str = f"{match['event_date_start']} {event_time}"
            match_datetime = datetime.strptime(match_datetime_str, "%Y-%m-%d %H:%M")
            match_ist = match_datetime.replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=5, minutes=30)))

            teams = f"{match['event_home_team']} vs {match['event_away_team']}"
            status = match.get("event_status", "⏳ Upcoming")
            status_info = match.get("event_status_info", "")

            # ✅ Scores
            home_score = match.get("event_home_final_result", "")
            away_score = match.get("event_away_final_result", "")
            score = f"{match['event_home_team']} {home_score} - {match['event_away_team']} {away_score}"

            matches_today.append({
                "time": match_ist.strftime("%d-%m-%Y %H:%M:%S"),
                "teams": teams,
                "league": match.get("league_name", ""),
                "status": status,
                "status_info": status_info,
                "score": score
            })
        except Exception as e:
            continue

    return matches_today


if __name__ == "__main__":
    matches = get_today_matches()
    print(f"\n📌 Matches Today (IST) ({datetime.now().strftime('%d-%m-%Y')})")
    print("-" * 90)

    if not matches:
        print("No matches found for today.")
    else:
        for m in matches:
            print(f"{m['time']} — {m['teams']} [{m['league']}]")
            print(f"   📊 {m['score']}")
            print(f"   🏏 {m['status']} — {m['status_info']}")
            print("-" * 90)
