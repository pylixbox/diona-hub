"""
Stand-in for a real sensor until the Raspberry Pi arrives: sends a
heartbeat every 20 seconds so the dev node shows ONLINE on the dashboard.
Leave it running in its own terminal (venv active), Ctrl+C to stop:

    python demo_heartbeat.py

Stop it and the node flips to offline after ~5 minutes, which is a
handy way to demo the offline state too.
"""
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()

NODE_API_KEY = os.environ.get("NODE_API_KEY")
if not NODE_API_KEY:
    raise RuntimeError("Set NODE_API_KEY in the environment or .env file before starting the heartbeat.")

ENDPOINT = "http://127.0.0.1:5000/api/nodes/heartbeat"
HEADERS = {"Authorization": f"Bearer {NODE_API_KEY}"}
PAYLOAD = {
    "node_name": "diona-dev-node-01",
    "ip_address": "192.168.1.50",
    "location_room": "Dev VM",
}

while True:
    try:
        requests.post(ENDPOINT, json=PAYLOAD, headers=HEADERS, timeout=3).raise_for_status()
        print("heartbeat sent")
    except requests.RequestException as exc:
        print(f"heartbeat failed: {exc}")
    time.sleep(20)
