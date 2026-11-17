import os
from pathlib import Path

from app import create_app

app = create_app()

if __name__ == "__main__":
    tls_enabled = os.environ.get("TLS_ENABLED", "").strip().lower() == "true"
    ssl_context = None
    if tls_enabled:
        cert_dir = Path(__file__).resolve().parent / "certs"
        server_cert = cert_dir / "server.crt"
        server_key = cert_dir / "server.key"
        if not server_cert.is_file() or not server_key.is_file():
            raise RuntimeError(
                f"TLS is enabled, but {server_cert} or {server_key} is missing. "
                "Run generate_certs.sh first."
            )
        ssl_context = (str(server_cert), str(server_key))
        port = 5001
        protocol = "HTTPS"
    else:
        port = 5000
        protocol = "HTTP"

    # Printed once at startup so you can SEE which API routes this exact
    # copy of the backend is serving (the reloader runs this file twice,
    # so only print in the child process).
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        print(f"\nDIONA hub starting with {protocol} on 0.0.0.0:{port}")
        rules = sorted({r.rule for r in app.url_map.iter_rules() if r.rule.startswith("/api")})
        print("\nDIONA hub - registered API routes:")
        for rule in rules:
            print("   ", rule)
        if "/api/settings" not in rules:
            print("\n!! /api/settings is NOT registered. Check app/routes/__init__.py and app/routes/settings.py\n")
        print(f"Running from: {os.getcwd()}\n")

    # Debug server only. Use `gunicorn -w 2 -b 0.0.0.0:5000 run:app` for
    # anything closer to production (not available on Windows).
    app.run(host="0.0.0.0", port=port, debug=True, ssl_context=ssl_context)
