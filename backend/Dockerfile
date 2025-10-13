FROM python:3.11-slim

# system deps
RUN apt-get update && apt-get install -y build-essential netcat-traditional && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy source
COPY . .

# entrypoint script (added below)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

# use entrypoint so we can wait for Postgres, migrate, collectstatic then start gunicorn
ENTRYPOINT ["/entrypoint.sh"]
