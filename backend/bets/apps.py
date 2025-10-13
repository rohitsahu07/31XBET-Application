# bets/apps.py
import os, sys
from django.apps import AppConfig

class BetsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bets"

    def ready(self):
        serve_contexts = {"runserver", "gunicorn", "uvicorn"}
        cmd = " ".join(sys.argv)
        if not any(c in cmd for c in serve_contexts):
            return
        if "runserver" in cmd and os.environ.get("RUN_MAIN") != "true":
            return
        from .engine import start_engine
        start_engine()
        print("[engine] background engine started (single)")
