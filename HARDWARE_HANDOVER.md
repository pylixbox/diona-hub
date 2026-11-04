# DIONA Hardware Integration Handover

This document is the implementation handoff for adding the Raspberry Pi 3B + Snort observer to the existing DIONA system. Keep the hardware-side work compatible with the API contract below unless a deliberate backend change is approved.

## Current System

The workspace has two applications:

- `diona-hub/`: Flask API, SQLAlchemy models, SQLite development database, authentication, alert storage, OTX enrichment, and Telegram notifications.
- `diona-dashboard/`: React/Vite dashboard that reads alerts, node health, statistics, and settings from the hub.
- `eve_shipper.py`: existing sensor-side reference implementation. It tails Suricata `eve.json`; it is not a Snort parser and should not be assumed compatible with Snort output.

The repository was last checked at commit `fb22671`. The workspace file is `diona-hub/DIONA.code-workspace`.

## End-to-End Flow

1. Snort observes traffic on the Pi and writes alert events in its configured output format.
2. A small sensor-side adapter reads new events and converts them to DIONA's JSON contract.
3. The adapter POSTs each alert to the hub's `/api/alerts` endpoint and sends a heartbeat to `/api/nodes/heartbeat` about every 30 seconds.
4. The hub stores the alert and updates the node heartbeat. It attempts OTX enrichment and Telegram delivery on the hub; the Pi must not receive or store either credential.
5. The dashboard polls authenticated read endpoints and derives node online status from heartbeat age. The default stale threshold is five minutes.

## Required API Contract

Configure the Pi with the hub's reachable LAN address, not `127.0.0.1` unless the hub runs on the Pi. The current development default is `http://127.0.0.1:5000/api/alerts`.

### Alert ingestion

`POST http://<hub-host>:5000/api/alerts`

Content type: `application/json`

Required fields:

```json
{
  "node_name": "diona-pi-01",
  "source_ip": "198.51.100.10",
  "attack_type": "Snort rule message"
}
```

Optional fields:

```json
{
  "target_ip": "192.0.2.20",
  "severity_level": "High",
  "timestamp": "2026-11-04T09:30:00+00:00"
}
```

- `node_name`: stable, unique name for this Pi. Do not change it between process restarts.
- `source_ip`: source address from the parsed Snort event; required and non-empty.
- `target_ip`: destination address; optional.
- `attack_type`: Snort event/rule message; required and non-empty. Keep it concise enough for the database's 128-character field.
- `severity_level`: use exactly `High`, `Medium`, or `Low`. If omitted, the hub uses `Medium`. Document and test the Snort-priority-to-DIONA mapping; do not assume Suricata's numeric severity mapping applies to Snort.
- `timestamp`: ISO 8601 with `Z` or an explicit UTC offset. Prefer the timestamp reported by Snort. The hub stores timestamps as UTC and the dashboard displays Philippines time (PHT, UTC+8).
- A successful ingestion returns HTTP `201` and the stored alert object. Invalid JSON or missing required fields returns HTTP `400`.

### Heartbeat

`POST http://<hub-host>:5000/api/nodes/heartbeat`

```json
{
  "node_name": "diona-pi-01",
  "ip_address": "192.168.1.50",
  "location_room": "Network closet"
}
```

Only `node_name` is required. `ip_address` and `location_room` are optional. Send about every 30 seconds, including when there are no alerts. Successful requests return `{"ok": true}`.

## Configuration Convention

Follow the environment-variable pattern in `eve_shipper.py`; avoid hardcoded hostnames and editing source to change deployment values.

Recommended sensor-side variables:

- `DIONA_FLASK_ENDPOINT`: complete alert endpoint URL, e.g. `http://<hub-host>:5000/api/alerts`.
- `DIONA_HEARTBEAT_ENDPOINT`: optional explicit heartbeat URL. Otherwise derive it from `DIONA_FLASK_ENDPOINT` as the current shipper does.
- `DIONA_NODE_NAME`: stable unique node name, e.g. `diona-pi-01`.
- `DIONA_NODE_LOCATION`: optional human-readable location.
- Add a Snort log path variable appropriate to the selected Snort version/output plugin rather than hardcoding a path.

Do not put the OTX API key, Telegram bot token, dashboard password, or other hub secrets on the Pi. OTX and Telegram are hub-side integrations configured in the dashboard or hub environment.

## Snort Adapter Requirements

Before implementation, use the thesis manuscript to confirm the intended Snort major version, Raspberry Pi OS, network interface/topology, monitoring mode, output plugin, and rule configuration. Snort 2 and Snort 3 do not necessarily emit the same JSON format. Do not assume Snort writes Suricata-compatible `eve.json`.

Implement a small adapter between the chosen Snort event output and the API contract. Keep parsing separate from HTTP delivery so the parser can be tested using captured or synthetic log lines. At minimum:

- Process only alert events; ignore unrelated Snort event types.
- Map event source/destination, rule message, timestamp, and priority to the fields above.
- Ignore malformed/incomplete log records safely and log a concise reason without dumping secrets.
- Stream the log rather than loading it all into memory; the Pi 3B has limited resources.
- Handle file rotation/restart and network outages deliberately. The existing Suricata example starts at end-of-file and has simple retries; it is a reference, not a reliability guarantee.
- Use request timeouts and bounded backoff. Consider a small persistent spool if loss during hub outages is unacceptable. The current API has no idempotency key, so retries after an ambiguous timeout can create duplicate alerts; document this trade-off before adding retry behavior.
- Run the adapter with only the permissions needed to read Snort's alert output and reach the hub. Avoid running the adapter as root just to read logs if group/file permissions can solve that.
- Do not add schema or dashboard changes just to accommodate the adapter; preserve the existing alert JSON contract.

## Existing Endpoint Security Limitation

`POST /api/alerts` and `POST /api/nodes/heartbeat` currently do not require sensor authentication. This is explicitly a development-phase limitation in the route code. Keep the hub on a trusted, firewalled LAN and do not expose port 5000 to the public Internet. The Flask debug server is for local development only. If the deployment needs to cross an untrusted network, pause and design sensor authentication and transport security before exposing these endpoints; do not invent an incompatible header or silently change the API.

## Dashboard Account Setup

Dashboard accounts live in the hub's local SQLite database (`diona-hub/instance/diona.db` by default), which is intentionally excluded from Git. A fresh clone creates the database tables on startup but does not contain an admin user. To create or reset an account on each machine, activate the hub virtual environment, change to `diona-hub/`, then run:

```powershell
flask --app run:app set-admin-password --username admin
```

The command prompts for the new password twice without echoing it and stores only a bcrypt hash. Omit `--username admin` to use the default. Do not add a default password to source, `.env.example`, seed data, or Git.

## Safe Integration Test Plan

Use an isolated, authorized lab network and synthetic/captured alert records. Do not generate scans or attack traffic against networks without explicit authorization.

1. Confirm Snort is producing the selected structured alert output and inspect a sanitized sample event.
2. Unit-test parsing: valid alert, non-alert event, malformed line, missing source/destination, unknown priority, and timestamp with timezone.
3. POST a known synthetic payload to the hub and confirm HTTP `201` and the expected fields in the response.
4. Send a heartbeat and confirm the named node appears online in the dashboard. Stop heartbeats and confirm it becomes offline after the configured stale threshold.
5. Confirm an alert appears under the expected node and that severity, source, destination, and event time are correct. Dashboard times are shown in PHT.
6. Test hub-unavailable behavior and restart/recovery without leaking credentials or exhausting Pi storage.
7. Treat OTX/Telegram as optional hub-side integrations. A private or documentation-only sample IP may not be resolvable by OTX; that does not mean Snort parsing or alert delivery failed.

## Files To Read Before Editing

- `eve_shipper.py`: existing HTTP contract and heartbeat behavior for Suricata.
- `diona-hub/app/routes/alerts.py`: alert validation, storage, OTX and Telegram hooks, retry endpoint.
- `diona-hub/app/routes/nodes.py`: heartbeat upsert and online/offline calculation.
- `diona-hub/app/models.py`: `Node` and `Alert` fields and serialization.
- `diona-hub/app/config.py`: hub configuration and stale-node threshold.
- `diona-dashboard/src/api/client.js`: dashboard API paths.

Do not edit dashboard or hub code unless the sensor integration cannot meet this contract and the required API change is explained and approved first.

## Prompt For The Next Agent

> Read `HARDWARE_HANDOVER.md` and the thesis manuscript before making changes. The goal is to integrate a Raspberry Pi 3B running the manuscript's specified Snort version with the existing DIONA Flask hub. First report the Snort version/output format and the exact mapping from Snort fields to DIONA's alert payload. Implement the sensor-side adapter and deployment configuration only, preserving `POST /api/alerts` and `POST /api/nodes/heartbeat`. Do not assume Snort output is Suricata `eve.json`, do not add credentials to the Pi, and do not modify the hub/dashboard API or database without explaining the incompatibility and asking first. Add focused parser tests and safe synthetic integration checks. At the end, list changed files, installation/service steps, configuration variables, test commands/results, and any unresolved deployment assumptions.
