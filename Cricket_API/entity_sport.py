import requests
from datetime import datetime

API_TOKEN = "ec471071441bb2ac538a0ff901abd249"
BASE_URL = "https://rest.entitysport.com/v2"

def fetch_all_matches():
    url = f"{BASE_URL}/matches/?per_page=50&paged=1&token={API_TOKEN}"
    print("🔗 Requesting:", url)
    resp = requests.get(url)
    data = resp.json()
    return data.get("response", {}).get("items", [])

if __name__ == "__main__":
    today = datetime.now().strftime("%Y-%m-%d")
    print(f"📌 Matches for Today ({today}):")
    print("-" * 80)

    matches = fetch_all_matches()
    print("✅ Total matches fetched:", len(matches))

    # 🔎 Print first 5 matches to inspect
    for i, m in enumerate(matches[:5], 1):
        match_date = m.get("date_start", "")
        title = m.get("title")
        status = m.get("status_str")
        teama = m.get("teama", {}).get("name")
        teamb = m.get("teamb", {}).get("name")
        print(f"{i}. {title} | {teama} vs {teamb} | {status} | Date: {match_date}")
