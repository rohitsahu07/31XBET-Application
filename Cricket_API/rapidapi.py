import http.client
import json
import re
from datetime import datetime, timezone, timedelta

# ---------- Config ----------
RAPIDAPI_HOST = "cricbuzz-cricket.p.rapidapi.com"
RAPIDAPI_KEY = "7235d00040msh0b32254c6c78051p17e15bjsnb35461da80bf"

IST = timezone(timedelta(hours=5, minutes=30))
today_str = datetime.now(IST).strftime("%d-%m-%Y")

# Strict league/tournament allow-list (with common aliases)
LEAGUE_PATTERNS = [
    r"\bindian premier league\b|\bipl\b",
    r"\bdelhi premier league\b|\bdpl\b",
    r"\bmaharaja trophy\b|\bksca t20\b",
    r"\btamil nadu premier league\b|\btnpl\b",
    r"\buttar pradesh t20\b|\bup t20\b",
    r"\bandhra premier league\b|\bapl\b",
    r"\bsaurashtra premier league\b|\bspl\b",
    r"\bt20 mumbai\b|\bmumbai t20\b|\bt20 mumbai league\b",
    r"\bwomen'?s premier league\b|\bwpl\b",
    r"\bthe hundred\b",  # men & women
    r"\bbig bash league\b|\bbbl\b",
    r"\bbangladesh premier league\b|\bbpl\b",
    r"\blanka premier league\b|\blpl\b",
    r"\bcaribbean premier league\b|\bcpl\b",
    r"\bsa20\b",
    r"\bpakistan super league\b|\bpsl\b",
    r"\babu dhabi t10\b|\bt10 league\b",
    r"\bwomen'?s big bash league\b|\bwbb[l1]\b",
    r"\bfairbreak\b",  # FairBreak Invitational T20
]
LEAGUE_REGEXES = [re.compile(p, re.IGNORECASE) for p in LEAGUE_PATTERNS]

# Keywords for internationals (Men & Women)
INTL_KEYWORDS = {"T20I", "ODI", "TEST", "WT20I", "WODI", "WTEST"}

def is_allowed_series(series_name: str) -> bool:
    s = (series_name or "").strip()
    if not s:
        return False
    return any(rx.search(s) for rx in LEAGUE_REGEXES)

def is_international_allowed(match_info: dict, series_name: str) -> bool:
    fmt = (match_info.get("matchFormat") or match_info.get("matchType") or "").upper()
    desc = (match_info.get("matchDesc") or "").upper()
    sname = (series_name or "").upper()
    blob = " ".join([fmt, desc, sname])
    return any(k in blob for k in INTL_KEYWORDS)

def parse_start_time_ms(ms_str: str):
    try:
        ts = int(ms_str) // 1000
        return datetime.fromtimestamp(ts, IST)
    except Exception:
        return None

def fetch_matches(endpoint: str):
    conn = http.client.HTTPSConnection(RAPIDAPI_HOST)
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
    }
    conn.request("GET", endpoint, headers=headers)
    res = conn.getresponse()
    data = res.read()
    conn.close()
    try:
        return json.loads(data.decode("utf-8"))
    except Exception:
        return {}

# ---------- Fetch from recent + upcoming ----------
recent_data = fetch_matches("/matches/v1/recent")
upcoming_data = fetch_matches("/matches/v1/upcoming")

all_data = [recent_data, upcoming_data]

today_matches = []
now = datetime.now(IST)

for data in all_data:
    if "typeMatches" not in data:
        continue
    for block in data["typeMatches"]:
        for series in block.get("seriesMatches", []):
            wrapper = series.get("seriesAdWrapper", {})
            series_name = wrapper.get("seriesName", "") or ""
            matches = wrapper.get("matches", []) or []

            for m in matches:
                match_info = m.get("matchInfo", {}) or {}
                start_ms = match_info.get("startDate")
                if not start_ms:
                    continue

                dt_start = parse_start_time_ms(start_ms)
                if not dt_start:
                    continue

                # ✅ Only today
                if dt_start.strftime("%d-%m-%Y") != today_str:
                    continue

                # ✅ Only whitelisted or internationals
                if not (is_allowed_series(series_name) or is_international_allowed(match_info, series_name)):
                    continue

                team1 = match_info.get("team1", {}).get("teamName", "").strip()
                team2 = match_info.get("team2", {}).get("teamName", "").strip()

                # Scores
                match_score = m.get("matchScore") or {}
                parts = []
                if "team1Score" in match_score:
                    s = match_score["team1Score"].get("inngs1", {}) or {}
                    parts.append(f"{team1} {s.get('runs','0')}/{s.get('wickets','0')} ({s.get('overs','0')})")
                if "team2Score" in match_score:
                    s = match_score["team2Score"].get("inngs1", {}) or {}
                    parts.append(f"{team2} {s.get('runs','0')}/{s.get('wickets','0')} ({s.get('overs','0')})")
                score_str = "  |  ".join(parts) if parts else ""

                # Status
                if dt_start > now:
                    status = "⏳ Upcoming"
                elif match_score:
                    status = "🔴 Live / Finished"
                else:
                    status = "⚪ Scheduled"

                today_matches.append({
                    "series": series_name,
                    "t1": team1,
                    "t2": team2,
                    "dt": dt_start,
                    "time_str": dt_start.strftime("%d-%m-%Y %H:%M:%S"),
                    "score": score_str,
                    "status": status
                })

# ---------- Print ----------
print(f"\n📌 Matches Today (IST) – Strict Allow List ({today_str})")
print("-" * 90)

if not today_matches:
    print("No matches found for the selected competitions/formats today.")
else:
    today_matches.sort(key=lambda x: x["dt"])
    for m in today_matches:
        print(f"{m['time_str']}  —  {m['t1']} vs {m['t2']}  [{m['series']}]  {m['status']}")
        if m["score"]:
            print(f"   📊 {m['score']}")
        print("-" * 90)
