"""
Optional: pumps a handful of realistic-looking test alerts into the
DIONA hub so the dashboard has something to show during a demo.

Run this AFTER the backend (run.py) is already running in another
terminal window:

    python seed_demo_alerts.py
"""
import requests

FLASK_ENDPOINT = "http://127.0.0.1:5000/api/alerts"

SAMPLE_ALERTS = [
    {
        "node_name": "diona-dev-node-01",
        "source_ip": "192.168.1.104",
        "target_ip": "192.168.1.10",
        "attack_type": "DIONA Possible TCP SYN Port Scan",
        "severity_level": "Medium",
    },
    {
        "node_name": "diona-dev-node-01",
        "source_ip": "203.0.113.55",
        "target_ip": "192.168.1.22",
        "attack_type": "DIONA Possible SSH Brute Force - Repeated Connection Attempts",
        "severity_level": "High",
    },
    {
        "node_name": "diona-dev-node-01",
        "source_ip": "192.168.1.117",
        "target_ip": "192.168.1.10",
        "attack_type": "DIONA Possible TCP SYN Port Scan",
        "severity_level": "Low",
    },
    {
        "node_name": "diona-dev-node-01",
        "source_ip": "198.51.100.23",
        "target_ip": "192.168.1.22",
        "attack_type": "DIONA Possible SSH Brute Force - Repeated Connection Attempts",
        "severity_level": "High",
    },
]

if __name__ == "__main__":
    for alert in SAMPLE_ALERTS:
        try:
            resp = requests.post(FLASK_ENDPOINT, json=alert, timeout=5)
            resp.raise_for_status()
            print(f"seeded: {alert['attack_type']} from {alert['source_ip']}")
        except requests.RequestException as exc:
            print(f"failed to seed one alert: {exc}")

    print("Done. Refresh the dashboard - it polls every 5 seconds.")
