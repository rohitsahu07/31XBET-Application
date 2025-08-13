import psycopg2
from psycopg2 import OperationalError
import redis
import requests

# -------------------- Config --------------------
SECRET_KEY = "n*&1era2%_@a&e)&pl5w!4*g@#s_g#hf)33)_=*vhz7dcdsmnb"
DB_NAME = "betting_app_data"
DB_USER = "betting_app"
DB_PASSWORD = "Admin@123"
DB_HOST = "localhost"
DB_PORT = "5432"
REDIS_URL = "redis://127.0.0.1:6379/0"
CRICKET_API_KEY = "536767d8-12d5-4f10-93b8-8331300db647"

# -------------------- PostgreSQL --------------------
def check_postgres():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        print("✅ PostgreSQL: Connection successful, read access OK")

        # Test write permission with a temp table
        cur.execute("CREATE TEMP TABLE test_perm(id SERIAL);")
        cur.execute("DROP TABLE test_perm;")
        print("✅ PostgreSQL: Write access OK")

        conn.close()
    except OperationalError as e:
        print("❌ PostgreSQL: Connection failed!")
        print(f"Error: {e}")
    except Exception as e:
        print("❌ PostgreSQL: Unexpected error!")
        print(f"Error: {e}")

# -------------------- Redis --------------------
def check_redis():
    try:
        r = redis.Redis.from_url(REDIS_URL)
        if r.ping():
            print("✅ Redis: Connection successful (PONG received)")
        else:
            print("❌ Redis: PING failed")
    except Exception as e:
        print("❌ Redis: Connection failed!")
        print(f"Error: {e}")

# -------------------- Cricket API --------------------
def check_cricket_api():
    try:
        url = f"https://cricketdata.org/api/v1/currentMatches?apikey={CRICKET_API_KEY}"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            matches = data.get("data", [])
            print(f"✅ Cricket API: Key is valid, {len(matches)} live/current matches found")
            if matches:
                print("Sample Match Info:")
                sample = matches[0]
                print(f"  - {sample.get('name')} | Status: {sample.get('status')}")
        elif response.status_code == 401:
            print("❌ Cricket API: Invalid API key (401 Unauthorized)")
        elif response.status_code == 403:
            print("❌ Cricket API: Access forbidden (403), check endpoint or plan")
        else:
            print(f"❌ Cricket API: Unexpected status code {response.status_code}")
    except Exception as e:
        print("❌ Cricket API: Connection failed!")
        print(f"Error: {e}")

# -------------------- Main --------------------
if __name__ == "__main__":
    print("Checking PostgreSQL...")
    check_postgres()
    print("\nChecking Redis...")
    check_redis()
    print("\nChecking Cricket API...")
    check_cricket_api()
