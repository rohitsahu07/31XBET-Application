#!/usr/bin/env bash
set -e

# Required env:
# DJANGO_SECRET_KEY, DJANGO_DEBUG, DJANGO_ALLOWED_HOSTS
# POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT

echo "Waiting for Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
for i in {1..60}; do
  nc -z "${POSTGRES_HOST}" "${POSTGRES_PORT}" && break
  echo "Postgres not ready yet... ($i)"
  sleep 1
done

python manage.py migrate --noinput

# Collect static safely even if STATIC_ROOT not pre-configured
python manage.py collectstatic --noinput || true

# Start gunicorn
exec gunicorn betting_app.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 60
