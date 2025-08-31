import os
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# 🔹 Load environment variables
load_dotenv()

# 📌 CricAPI credentials
API_KEY = os.getenv("CRICAPI_KEY")
BASE_URL = "https://api.cricapi.com/v1/currentMatches"

# 📌 Known leagues mapping
LEAGUES = {
    "kanpur": "Uttar Pradesh T20",
    "meerut": "Uttar Pradesh T20",
    "lucknow": "Uttar Pradesh T20",
    "gorakhpur": "Uttar Pradesh T20",
    "noida": "Uttar Pradesh T20",
    "delhi": "Delhi Premier League",
    "thrissur": "Kerala T20 Trophy",
    "calicut": "Kerala T20 Trophy",
    "alleppey": "Kerala T20 Trophy",
    "kollam": "Kerala T20 Trophy",
    "koch": "Kerala T20 Trophy",
    "south africa a": "One Day Internationals",
    "new zealand a": "One Day Internationals",
    "bangladesh": "International Twenty20 Matches",
    "netherlands": "International Twenty20 Matches",
    "northern superchargers w": "The Hundred - Womens",
    "london spirit w": "The Hundred - Womens",
    "trent rockets": "The Hundred",
    "northern superchargers": "The Hundred",
    "united arab emirates": "International Twenty20 Matches",
    "pakistan": "International Twenty20 Matches",
    "india": "Twenty20 Internationals",
    "sri lanka": "Twenty20 Internationals",
    "afghanistan": "Twenty20 Internationals",
    "zimbabwe": "Twenty20 Internationals",
}

# 🔹 Timezone for India
IST = timezone(timedelta(hours=5, minutes=30))


def normalize_name(name: str) -> str:
    """Normalize team names by removing prefixes."""
    name = name.lower().strip()
    prefixes = ["adani", "gaur", "trn", "tn", "tnpl"]
    for p in prefixes:
        if name.startswith(p):
            name = name.replace(p, "").strip()
    return name


def detect_league(match: dict) -> str:
    """Detect league/tournament name from match info."""
    series = match.get("series", "")
    match_type = match.get("matchType", "").lower()
    teams = [normalize_name(t.get("name", "")) for t in match.get("teamInfo", [])]
    venue = (match.get("venue") or "").lower()

    if series:
        return series

    if match_type == "odi":
        return "One Day Internationals"
    if match_type == "test":
        return "Test Matches"
    if match_type == "t20":
        for country in [
            "india", "pakistan", "sri lanka", "zimbabwe",
            "afghanistan", "united arab emirates",
            "bangladesh", "netherlands"
        ]:
            if country in teams:
                return "International Twenty20 Matches"

    for key, league in LEAGUES.items():
        if any(key in t for t in teams) or key in venue:
            return league

    return "Unknown Tournament"


def parse_match_datetime(date_str: str) -> datetime | None:
    """Convert CricAPI datetime string to IST datetime object."""
    if not date_str:
        return None

    try:
        if date_str.endswith("Z"):  # UTC Zulu format
            dt = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = datetime.fromisoformat(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(IST)
    except Exception as e:
        print(f"⚠️ Failed to parse datetime: {date_str} ({e})")
        return None


def get_cricket_matches() -> list[dict]:
    """Fetch and return today's cricket matches in IST timezone."""
    if not API_KEY:
        print("⚠️ CRICAPI_KEY not found in environment")
        return []

    today = datetime.now(IST).date()
    all_matches = []
    offset = 0

    # 🔹 Fetch matches with pagination
    while True:
        try:
            response = requests.get(
                f"{BASE_URL}?apikey={API_KEY}&offset={offset}",
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            matches = data.get("data", [])
            if not matches:
                break
            all_matches.extend(matches)
            offset += len(matches)
        except Exception as e:
            print("⚠️ API Error:", e)
            break

    final_matches = []

    for match in all_matches:
        match_dt = parse_match_datetime(
            match.get("dateTimeGMT") or match.get("date")
        )
        if not match_dt or match_dt.date() != today:
            continue

        league_type = detect_league(match)

        teams_info = [
            {
                "name": t.get("name", ""),
                "shortname": t.get("shortname", ""),
                "img": t.get("img", "")
            }
            for t in match.get("teamInfo", [])
        ]

        final_matches.append({
            "datetime": match_dt,
            "league": league_type,
            "teams": teams_info
        })

    # Sort by datetime
    final_matches.sort(key=lambda x: x["datetime"])

    # Debug print
    print("\n📅 Today's Matches")
    print("=" * 70)
    for idx, match in enumerate(final_matches, start=1):
        team_str = " vs ".join(
            [f'{t["name"]} ({t["shortname"]})' for t in match["teams"]]
        )
        print(f"{idx:2}. {team_str:<50} | {match['datetime'].strftime('%H:%M %p')} IST | {match['league']}")
        for t in match["teams"]:
            print(f"     - {t['shortname']} logo: {t['img']}")
    print("=" * 70)

    return final_matches
