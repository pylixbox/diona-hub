import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Printed once at startup so you can SEE which API routes this exact
    # copy of the backend is serving (the reloader runs this file twice,
    # so only print in the child process).
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        rules = sorted({r.rule for r in app.url_map.iter_rules() if r.rule.startswith("/api")})
        print("\nDIONA hub - registered API routes:")
        for rule in rules:
            print("   ", rule)
        if "/api/settings" not in rules:
            print("\n!! /api/settings is NOT registered. Check app/routes/__init__.py and app/routes/settings.py\n")
        print(f"Running from: {os.getcwd()}\n")

    # Debug server only. Use `gunicorn -w 2 -b 0.0.0.0:5000 run:app` for
    # anything closer to production (not available on Windows).
    app.run(host="0.0.0.0", port=5000, debug=True)
