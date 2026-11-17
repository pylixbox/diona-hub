# DIONA

A distributed intrusion detection dashboard. Suricata sensors on observer nodes ship alerts to a central Flask hub, which stores them in PostgreSQL and visualizes them in a React dashboard with node health monitoring, threat enrichment, and Telegram notifications.

## Architecture

```
┌─────────────────┐   eve.json    ┌──────────────────┐   REST API    ┌───────────────────┐
│  Observer Node  │ ────────────► │    DIONA Hub     │ ◄──────────── │  DIONA Dashboard  │
│  (Suricata +    │  eve_shipper  │ Flask + Postgres │  /api/*       │  React + Vite     │
│   eve_shipper)  │     .py       │ (TLS optional)   │               │                   │
└─────────────────┘               └──────────────────┘               └───────────────────┘
        │                                  │
   alert events +              alerts, nodes, stats, settings,
   30s heartbeats              auth, OTX enrichment, Telegram
```

- **`eve_shipper.py`** (repo root) — runs on each observer node. Tails `/var/log/suricata/eve.json`, POSTs every `alert` event to the hub, and sends a heartbeat every 30 s so the node shows ONLINE even when the network is quiet.
- **`diona-hub/`** — Flask REST API + PostgreSQL backend. Handles alert ingestion (API-key authenticated), node registration/health, user login, statistics, security settings, AlienVault OTX enrichment, and Telegram alerts. Supports optional self-signed TLS.
- **`diona-dashboard/`** — React 19 + Vite + Tailwind frontend. Login page plus overview/threats/alerts/nodes/settings views with KPI strip, charts (Recharts), top attackers, alert drawer, CSV export, and dark/light themes.

## Repository Layout

```
.
├── eve_shipper.py          # Suricata alert shipper (runs on observer nodes)
├── diona-hub/              # Flask backend ("the hub")
│   ├── run.py              # Dev entrypoint (HTTP :5000 / HTTPS :5001)
│   ├── app/
│   │   ├── models.py       # User, Node, Alert, settings models
│   │   ├── routes/         # /api/auth, /api/alerts, /api/nodes, /api/stats, /api/settings
│   │   └── services/       # OTX enrichment, Telegram notifications, settings store
│   ├── setup_db.sh         # Provisions PostgreSQL (Debian/Ubuntu/Raspberry Pi OS)
│   ├── reset_db.py         # Drops and recreates tables
│   ├── seed_demo_alerts*.py, demo_heartbeat.py   # Demo data generators
│   ├── generate_certs.sh   # Self-signed CA + server certs (see TLS_SETUP.md)
│   └── requirements.txt
└── diona-dashboard/        # React frontend
    ├── src/pages/          # Login, Overview, Threats, Alerts, Nodes, Settings
    ├── src/components/     # Charts, tables, KPIs, node health, etc.
    └── package.json
```

## Quick Start

### 1. Database

```sh
cd diona-hub
cp .env.example .env        # then edit: SECRET_KEY, DB_PASSWORD, NODE_API_KEY, ...
bash setup_db.sh            # installs & provisions PostgreSQL + diona_hub database
pip install -r requirements.txt
```

### 2. Backend (hub)

```sh
python run.py               # HTTP on 0.0.0.0:5000
```

For TLS (recommended for multi-machine testbeds):

```sh
bash generate_certs.sh <hub-ip-or-hostname>   # creates certs/ (git-ignored)
# set TLS_ENABLED=true in .env, then:
python run.py               # HTTPS on 0.0.0.0:5001
```

See [TLS_SETUP.md](diona-hub/TLS_SETUP.md) for details. Create an admin account with:

```sh
flask --app run set-admin-password --username admin
```

For anything closer to production: `gunicorn -w 2 -b 0.0.0.0:5000 run:app`.

### 3. Frontend (dashboard)

```sh
cd diona-dashboard
cp .env.example .env        # VITE_API_BASE_URL=http://<hub-host>:5000
npm install
npm run dev                 # Vite dev server
```

### 4. Observer node (sensor shipper)

Copy `eve_shipper.py` to a machine running Suricata and configure it via environment variables (no code edits needed):

| Variable | Default | Purpose |
|---|---|---|
| `DIONA_FLASK_ENDPOINT` | `http://127.0.0.1:5000/api/alerts` | Hub alerts endpoint |
| `DIONA_HEARTBEAT_ENDPOINT` | derived from alerts endpoint | Hub heartbeat endpoint |
| `DIONA_NODE_NAME` | `diona-dev-node-01` | Node identifier shown on dashboard |
| `DIONA_NODE_LOCATION` | `Dev VM` | Room/location label |

```sh
pip install requests
DIONA_FLASK_ENDPOINT=http://<hub-host>:5000/api/alerts python3 eve_shipper.py
```

The shipper starts tailing from the **end** of `eve.json` — only new alerts are shipped. Suricata severities are mapped 1→High, 2→Medium, 3→Low.

## API Overview

| Endpoint | Methods | Auth | Description |
|---|---|---|---|
| `/api/auth/login`, `/logout`, `/me` | POST/GET | Session | User authentication (Flask-Login + bcrypt) |
| `/api/alerts` | GET, POST | Session / `NODE_API_KEY` | List alerts; ingest alerts from shippers |
| `/api/alerts/<id>/enrich` | POST | Session | AlienVault OTX reputation lookup |
| `/api/nodes` | GET | Session | Registered sensor nodes |
| `/api/nodes/heartbeat` | POST | `NODE_API_KEY` | Node liveness (ONLINE/STALE per `NODE_STALE_MINUTES`) |
| `/api/stats/summary`, `/top-sources` | GET | Session | Dashboard KPIs and top attacker IPs |
| `/api/settings` | GET, POST | Session | Security settings incl. Telegram & OTX keys |
| `/api/settings/test-telegram`, `/test-otx` | POST | Session | Connectivity tests |

## Configuration Reference (`diona-hub/.env`)

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask session secret (long random string) |
| `DATABASE_URL` / `DB_PASSWORD` | PostgreSQL connection (`postgresql://diona:...@localhost:5432/diona_hub`) |
| `NODE_API_KEY` | Shared secret that shippers present when posting alerts/heartbeats |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Optional alert notifications via Telegram |
| `OTX_API_KEY` | Optional AlienVault Open Threat Exchange enrichment |
| `TLS_ENABLED` | `true` → serve HTTPS on port 5001 using `certs/` |
| `NODE_STALE_MINUTES` | Heartbeat age after which a node is marked stale (default 5) |

Never commit the real `.env` file (it is git-ignored).

## Demo Data

From `diona-hub/` (with the hub's dependencies installed):

```sh
python seed_demo_alerts.py      # or seed_demo_alerts_v2.py — sample alert traffic
python demo_heartbeat.py        # simulated node heartbeats
python reset_db.py              # wipe and recreate all tables
```

## Tech Stack

- **Backend:** Python 3, Flask 3, SQLAlchemy, Flask-Login, Flask-Bcrypt, Flask-CORS, psycopg2, gunicorn
- **Frontend:** React 19, Vite 6, Tailwind CSS 3, Recharts, lucide-react
- **Sensor side:** Suricata (`eve.json`), requests
- **Security:** bcrypt password hashing, API-key node authentication, optional self-signed TLS, OTX threat intelligence
