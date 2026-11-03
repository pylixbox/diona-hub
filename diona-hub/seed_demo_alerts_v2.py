"""
Seeds a week of varied demo alerts (different days, severities, attack
types and source IPs) so the trend chart, severity donut, attack-type
chart and top-source list all have something real to show.

Run AFTER the backend (run.py) is already running, from a free
terminal with the venv active:

    python seed_demo_alerts_v2.py
"""
import random
from datetime import datetime, timedelta, timezone

import requests

FLASK_ENDPOINT = "http://127.0.0.1:5000/api/alerts"

ATTACK_TYPES = [
    "DIONA Possible TCP SYN Port Scan",
    "DIONA Possible SSH Brute Force - Repeated Connection Attempts",
]
SEVERITIES = ["High", "Medium", "Low"]
SOURCE_IPS = [
    "203.0.113.55", "198.51.100.23", "192.168.1.104",
    "192.168.1.117", "203.0.113.88", "198.51.100.140",
]
TARGET_IPS = ["192.168.1.10", "192.168.1.22"]

random.seed(7)  # reproducible demo data


def build_alerts():
    alerts = []
    for day_offset in range(6, -1, -1):
        day = datetime.now(timezone.utc) - timedelta(days=day_offset)
        for _ in range(random.randint(2, 6)):
            ts = day.replace(
                hour=random.randint(0, 23),
                minute=random.randint(0, 59),
                second=random.randint(0, 59),
            )
            alerts.append({
                "node_name": "diona-dev-node-01",
                "source_ip": random.choice(SOURCE_IPS),
                "target_ip": random.choice(TARGET_IPS),
                "attack_type": random.choice(ATTACK_TYPES),
                "severity_level": random.choices(SEVERITIES, weights=[2, 3, 3])[0],
                "timestamp": ts.isoformat(),
            })
    return alerts


if __name__ == "__main__":
    alerts = build_alerts()
    ok = 0
    for alert in alerts:
        try:
            resp = requests.post(FLASK_ENDPOINT, json=alert, timeout=10)
            resp.raise_for_status()
            ok += 1
        except requests.RequestException as exc:
            print(f"failed: {exc}")
    print(f"Seeded {ok}/{len(alerts)} alerts across the last 7 days.")
    print("Refresh the dashboard - it polls every 5 seconds.")
