import os
from ipaddress import ip_address
from pathlib import Path

from app import create_app

app = create_app()

if __name__ == "__main__":
    host = os.environ.get("DIONA_HOST", "127.0.0.1").strip()
    if not host:
        raise RuntimeError("DIONA_HOST must not be empty.")

    tls_enabled = os.environ.get("TLS_ENABLED", "").strip().lower() == "true"
    try:
        is_loopback = ip_address(host).is_loopback
    except ValueError:
        is_loopback = host.lower() == "localhost"
    if not is_loopback and not tls_enabled:
        raise RuntimeError("TLS_ENABLED=true is required to bind outside loopback.")

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

    print(f"\nDIONA hub starting with {protocol} on {host}:{port}")
    rules = sorted({r.rule for r in app.url_map.iter_rules() if r.rule.startswith("/api")})
    print("\nDIONA hub - registered API routes:")
    for rule in rules:
        print("   ", rule)
    if "/api/settings" not in rules:
        print("\n!! /api/settings is NOT registered. Check app/routes/__init__.py and app/routes/settings.py\n")
    print(f"Running from: {os.getcwd()}\n")

    app.run(host=host, port=port, debug=False, ssl_context=ssl_context)
