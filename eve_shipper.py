#!/usr/bin/env python3
"""
DIONA - Suricata Alert Shipper (runs on the observer node)

Two jobs:
  1. Tails Suricata's eve.json and POSTs each `alert` event to the hub
     (POST /api/alerts).
  2. Sends a heartbeat every 30s (POST /api/nodes/heartbeat) so the node
     shows ONLINE on the dashboard even when the network is quiet.

Configure via environment variables rather than editing this file:
  DIONA_FLASK_ENDPOINT      default http://127.0.0.1:5000/api/alerts
  DIONA_HEARTBEAT_ENDPOINT  default: derived from the alerts endpoint
  DIONA_NODE_NAME           default diona-dev-node-01 (matches app/seed.py)
  DIONA_NODE_LOCATION       default "Dev VM"
"""

import json
import os
import threading
import time
from datetime import datetime, timezone

import requests

EVE_JSON_PATH = "/var/log/suricata/eve.json"
FLASK_ENDPOINT = os.environ.get("DIONA_FLASK_ENDPOINT", "http://127.0.0.1:5000/api/alerts")
HEARTBEAT_ENDPOINT = os.environ.get(
    "DIONA_HEARTBEAT_ENDPOINT",
    FLASK_ENDPOINT.rsplit("/api/alerts", 1)[0] + "/api/nodes/heartbeat",
)
NODE_NAME = os.environ.get("DIONA_NODE_NAME", "diona-dev-node-01")
NODE_LOCATION = os.environ.get("DIONA_NODE_LOCATION", "Dev VM")
POLL_INTERVAL_SEC = 0.5
HEARTBEAT_SEC = 30

# Suricata's numeric severity (1 = most severe, 3 = least) -> DIONA's severity_level
SEVERITY_MAP = {1: "High", 2: "Medium", 3: "Low"}


def build_payload(event):
    """Turn one Suricata eve.json alert event into a DIONA alert payload."""
    alert = event.get("alert")
    if not alert:
        return None
    return {
        "node_name": NODE_NAME,
        "source_ip": event.get("src_ip"),
        "target_ip": event.get("dest_ip"),
        "attack_type": alert.get("signature"),
        "severity_level": SEVERITY_MAP.get(alert.get("severity"), "Medium"),
        "timestamp": event.get("timestamp", datetime.now(timezone.utc).isoformat()),
    }


def tail(path):
    """Yield new lines appended to `path`, starting from the end of the file."""
    with open(path, "r") as f:
        f.seek(0, 2)  # skip existing content; only ship NEW alerts going forward
        while True:
            line = f.readline()
            if not line:
                time.sleep(POLL_INTERVAL_SEC)
                continue
            yield line


def heartbeat_loop():
    while True:
        try:
            requests.post(
                HEARTBEAT_ENDPOINT,
                json={"node_name": NODE_NAME, "location_room": NODE_LOCATION},
                timeout=3,
            ).raise_for_status()
        except requests.RequestException as exc:
            print(f"[heartbeat] failed: {exc}")
        time.sleep(HEARTBEAT_SEC)


def main():
    print(f"[diona-shipper] {EVE_JSON_PATH} -> {FLASK_ENDPOINT}")
    threading.Thread(target=heartbeat_loop, daemon=True).start()

    for line in tail(EVE_JSON_PATH):
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue

        if event.get("event_type") != "alert":
            continue

        payload = build_payload(event)
        if not payload:
            continue

        try:
            resp = requests.post(FLASK_ENDPOINT, json=payload, timeout=3)
            resp.raise_for_status()
            print(f"[shipped] {payload['attack_type']} from {payload['source_ip']}")
        except requests.RequestException as exc:
            print(f"[error] could not ship alert: {exc}")


if __name__ == "__main__":
    main()
