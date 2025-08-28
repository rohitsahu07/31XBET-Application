import requests, http.client, json, re
from datetime import datetime, timedelta, timezone
from collections import defaultdict

# ---------- Timezone ----------
IST = timezone(timedelta(hours=5, minutes=30))
today_str = datetime.now(IST).strftime("%d-%m-%Y")
today_date = datetime.now(IST).date()
now_ist = datetime.now(IST)

# ---------- Allow List ----------
LEAGUE_PATTERNS = [
    r"\bindian premier league\b|\bipl\b",
    r"\bdelhi premier league\b|\bdpl\b",
    r"\bmaharaja trophy\b|\bksca t20\b",
    r"\btamil nadu premier league\b|\btnpl\b",
    r"\buttar pradesh t20\b|\bup t20\b",
    r"\bandhra premier league\b|\bapl\b",
    r"\bsaurashtra premier league\b|\bspl\b",
    r"\bt20 mumbai\b|\bmumbai t20\b",
    r"\bwomen'?s premier league\b|\bwpl\b",
    r"\bthe hundred\b",
    r"\bbig bash league\b|\bbbl\b",
    r"\bbangladesh premier league\b|\bbpl\b",
    r"\blanka premier league\b|\blpl\b",
    r"\bcaribbean premier league\b|\bcpl\b",
    r"\bsa20\b",
    r"\bpakistan super league\b|\bpsl\b",
    r"\babu dhabi t10\b|\bt10 league\b",
    r"\bwomen'?s big bash league\b|\bwbb[l1]\b",
    r"\bfairbreak\b",
    r"\bmetro bank one day cup\b",  # Added for ENG domestic OD
    r"\bone[- ]day cup\b",
    r"\bkerala t20 trophy\b",        # Added for Kochi/Trivandrum
    r"\bkerala cricket league\b|\bkcl\b",
    r"\buttar pradesh premier league\b|\buppl\b"
]
LEAGUE_REGEXES = [re.compile(p, re.IGNORECASE) for p in LEAGUE_PATTERNS]

# ---------- Exclude List ----------
EXCLUDE_PATTERNS = [
    r"\bcentral zone\b",
    r"\beast zone\b",
    r"\bnorth zone\b",
    r"\bnorth east zone\b",
    r"\bsouth zone\b",
    r"\bwest zone\b",
    r"\bquarter-final\b"
]
EXCLUDE_REGEXES = [re.compile(p, re.IGNORECASE) for p in EXCLUDE_PATTERNS]

INTL_KEYWORDS = {"T20I", "ODI", "TEST", "WT20I", "WODI", "WTEST"}

FULL_MEMBERS = {
    'australia', 'aus',
    'england', 'eng',
    'south africa', 'sa', 'rsa',
    'new zealand', 'nz',
    'west indies', 'wi',
    'india', 'ind',
    'pakistan', 'pak',
    'sri lanka', 'sl', 'lka',
    'bangladesh', 'ban', 'bdesh',
    'afghanistan', 'afg',
    'ireland', 'ire',
    'zimbabwe', 'zim'
}

def is_major_team(team: str) -> bool:
    t = team.lower().strip()
    return any(t == fm or t.startswith(fm) for fm in FULL_MEMBERS)

def is_allowed(series: str) -> bool:
    if not series: return False
    return any(rx.search(series) for rx in LEAGUE_REGEXES)

def is_excluded(series: str) -> bool:
    if not series: return False
    return any(rx.search(series) for rx in EXCLUDE_REGEXES)

def is_international(series: str, fmt: str = "", desc: str = "") -> bool:
    blob = " ".join([series.upper(), fmt.upper(), desc.upper()])
    return any(k in blob for k in INTL_KEYWORDS)

def is_major_international(series: str, fmt: str = "", desc: str = "", t1: str = "", t2: str = "") -> bool:
    if not is_international(series, fmt, desc): return False
    return is_major_team(t1) and is_major_team(t2)

def normalize_series(series: str) -> str:
    if not series:
        return ""
    s = series.lower()
    s = re.sub(r"['’]", "", s)
    s = re.sub(r"\b\d{4}(-\d{2})?\b", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def normalize_teams(teams: str) -> str:
    if not teams:
        return ""
    t = teams.lower()
    t = re.sub(r"\s*\(women\)\s*", " ", t)
    t = re.sub(r"\s*\(men\)\s*", " ", t)
    t = re.sub(r"\s*women\s*", " ", t)
    t = re.sub(r"\s*women's\s*", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    team_list = [tm.strip() for tm in re.split(r"\s*vs\s*", t) if tm.strip()]
    team_list.sort()
    return " vs ".join(team_list)

# ---------- API Fetchers ----------

def from_api_cricket():
    API_URL = "https://apiv2.api-cricket.com/cricket/"
    API_KEY = "9251f4c3244e73d7b1ebcdad247b1b394007dc193b92dea0e84fee7c7f969263"
    today = datetime.now(IST).strftime("%Y-%m-%d")
    params = {"method":"get_events","APIkey":API_KEY,"date_start":today,"date_stop":today}
    try:
        r = requests.get(API_URL, params=params, timeout=10).json()
        if not r.get("success"): return []
        matches = []
        for m in r.get("result", []):
            series = m.get("league_name","")
            if is_excluded(series): continue
            t1, t2 = m.get("event_home_team",""), m.get("event_away_team","")
            if not (is_allowed(series) or is_major_international(series, t1=t1, t2=t2)): continue
            dt_str = f"{m['event_date_start']} {m.get('event_time','00:00')}"
            dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc).astimezone(IST)
            if dt.date() != today_date: continue
            matches.append((dt, f"{t1} vs {t2}", series))
        return matches
    except: return []

def from_cricapi():
    API_KEY = "536767d8-12d5-4f10-93b8-8331300db647"
    URL = f"https://api.cricapi.com/v1/currentMatches?apikey={API_KEY}&offset=0"
    try:
        r = requests.get(URL, timeout=10).json().get("data", [])
        matches = []
        for m in r:
            try:
                dt = datetime.fromisoformat(m["dateTimeGMT"])
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                dt = dt.astimezone(IST)
            except: continue
            if dt.date() != today_date: continue
            series = m.get("name","")
            if is_excluded(series): continue
            t1, t2 = m["teams"]
            fmt = m.get("matchType","")
            status = m.get("status","")
            if not (is_allowed(series) or is_major_international(series, fmt, status, t1, t2)): continue
            matches.append((dt, f"{t1} vs {t2}", series))
        return matches
    except: return []

def from_entitysport():
    API_TOKEN = "ec471071441bb2ac538a0ff901abd249"
    URL = f"https://rest.entitysport.com/v2/matches/?per_page=50&paged=1&token={API_TOKEN}"
    try:
        r = requests.get(URL, timeout=10).json()
        items = r.get("response", {}).get("items", [])
        matches = []
        for m in items:
            try:
                dt = datetime.fromisoformat(m.get("date_start"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                dt = dt.astimezone(IST)
            except: continue
            if dt.date() != today_date: continue
            series = m.get("subtitle","") or m.get("title","")
            if is_excluded(series): continue
            t1, t2 = m.get("teama", {}).get("name",""), m.get("teamb", {}).get("name","")
            if not (is_allowed(series) or is_major_international(series, t1=t1, t2=t2)): continue
            matches.append((dt, f"{t1} vs {t2}", series))
        return matches
    except: return []

def from_cricbuzz():
    HOST = "cricbuzz-cricket.p.rapidapi.com"
    KEY = "7235d00040msh0b32254c6c78051p17e15bjsnb35461da80bf"
    def fetch(ep):
        conn = http.client.HTTPSConnection(HOST)
        conn.request("GET", ep, headers={"x-rapidapi-key":KEY,"x-rapidapi-host":HOST})
        res = conn.getresponse().read()
        conn.close()
        try: return json.loads(res.decode())
        except: return {}
    data = [fetch("/matches/v1/recent"), fetch("/matches/v1/upcoming")]
    matches = []
    for block in data:
        for tm in block.get("typeMatches", []):
            for s in tm.get("seriesMatches", []):
                wrapper = s.get("seriesAdWrapper",{})
                series = wrapper.get("seriesName","")
                for m in wrapper.get("matches", []):
                    info = m.get("matchInfo",{})
                    ts = info.get("startDate")
                    if not ts: continue
                    dt = datetime.fromtimestamp(int(ts)//1000, IST)
                    if dt.date()!=today_date: continue
                    if is_excluded(series): continue
                    fmt = info.get("matchFormat","")
                    desc = info.get("matchDesc","")
                    t1 = info.get("team1",{}).get("teamName","")
                    t2 = info.get("team2",{}).get("teamName","")
                    if not (is_allowed(series) or is_major_international(series, fmt, desc, t1, t2)): continue
                    matches.append((dt, f"{t1} vs {t2}", series))
    return matches

# ---------- Merge all ----------
all_matches = []
for fetcher in [from_api_cricket, from_cricapi, from_entitysport, from_cricbuzz]:
    all_matches.extend(fetcher())

# Strict filter to today's date
all_matches = [m for m in all_matches if m[0].date() == today_date]

# Group by normalized key
match_groups = defaultdict(list)
for dt, teams, series in all_matches:
    n_teams = normalize_teams(teams)
    n_series = normalize_series(series)
    key = (dt.date(), n_teams, n_series)
    match_groups[key].append((dt, teams, series))

# Select one per group (earliest time)
final_matches = []
for key, group in match_groups.items():
    group.sort(key=lambda x: x[0])
    final_matches.append(group[0])

# ---------- Print ----------
print(f"\n📌 Matches Today (IST) — Strict Allow List ({today_str})")
print("-"*90)
if not final_matches:
    print("No matches found.")
else:
    final_matches.sort(key=lambda x:x[0])
    for dt, teams, series in final_matches:
        print(f"{teams} → {dt.strftime('%d-%m-%Y %H:%M:%S')} ({series})")