"""
Forward Snort JSON alerts and heartbeats to the DIONA hub.

Place config.json beside this script:
{
  "hub_ip": "https://192.168.15.177:5001",
  "node_name": "diona-pi-01",
  "api_key": "the same value as NODE_API_KEY on the hub",
  "ca_cert": "/home/pi/diona/ca.crt"
}
For HTTP, ca_cert may be omitted. Keep config.json private; it contains
the node API key.

The script follows new entries in /var/log/snort/alert_json.txt. Change
ALERT_LOG_PATH below if Snort writes its JSON alert log elsewhere.
"""
import json
import logging
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit

import requests

CONFIG_PATH = Path(__file__).resolve().with_name("config.json")
ALERT_LOG_PATH = Path("/var/log/snort/alert_json.txt")
HEARTBEAT_INTERVAL_SECONDS = 20
LOG_POLL_INTERVAL_SECONDS = 0.25
REQUEST_TIMEOUT_SECONDS = 10
INITIAL_RETRY_SECONDS = 2
MAX_RETRY_SECONDS = 60

logger = logging.getLogger("diona_shipper")


def load_config(path=CONFIG_PATH):
    try:
        with path.open(encoding="utf-8") as config_file:
            config = json.load(config_file)
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Could not load shipper config at {path}: {exc}") from exc

    if not isinstance(config, dict):
        raise RuntimeError(f"Shipper config at {path} must be a JSON object.")

    for key in ("hub_ip", "node_name", "api_key"):
        if not isinstance(config.get(key), str) or not config[key].strip():
            raise RuntimeError(f"Shipper config must contain a non-empty string for {key!r}.")

    ca_cert = config.get("ca_cert")
    if ca_cert is not None and not isinstance(ca_cert, str):
        raise RuntimeError("Shipper config value 'ca_cert' must be a path string.")

    return {
        **{key: config[key].strip() for key in ("hub_ip", "node_name", "api_key")},
        "ca_cert": ca_cert.strip() if ca_cert and ca_cert.strip() else None,
    }


def _hub_base_url(hub_address):
    address = hub_address.strip()
    parsed = urlsplit(address if "://" in address else f"//{address}")
    if parsed.scheme and parsed.scheme.lower() not in ("http", "https"):
        raise RuntimeError("hub_ip must use http:// or https://.")
    try:
        host = parsed.hostname
        port = parsed.port
    except ValueError as exc:
        raise RuntimeError(f"Invalid hub_ip value: {hub_address}") from exc
    if not host or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise RuntimeError("hub_ip must contain only a host and optional port.")

    tls_enabled = parsed.scheme.lower() == "https" or port == 5001
    scheme = "https" if tls_enabled else "http"
    if port is None:
        port = 5001 if tls_enabled else 5000
    formatted_host = f"[{host}]" if ":" in host else host
    return f"{scheme}://{formatted_host}:{port}", tls_enabled


def _tls_verify_value(tls_enabled, ca_cert, config_path=CONFIG_PATH):
    if not tls_enabled:
        return True
    if not ca_cert:
        logger.warning(
            "TLS is enabled without ca_cert; certificate verification is disabled. "
            "Configure the hub CA certificate for secure verification."
        )
        return False

    ca_cert_path = Path(ca_cert).expanduser()
    if not ca_cert_path.is_absolute():
        ca_cert_path = config_path.resolve().parent / ca_cert_path
    if not ca_cert_path.is_file():
        raise RuntimeError(f"CA certificate file not found: {ca_cert_path}")
    return str(ca_cert_path)


def _severity_label(value):
    labels = {
        "1": "High",
        "2": "Medium",
        "3": "Low",
        "high": "High",
        "medium": "Medium",
        "low": "Low",
    }
    return labels.get(str(value).strip().lower(), "Medium")


def _normalize_timestamp(value):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        pass

    year = datetime.now().year
    for timestamp_format in ("%m/%d-%H:%M:%S.%f", "%m/%d-%H:%M:%S"):
        try:
            parsed = datetime.strptime(f"{year}/{value}", f"%Y/{timestamp_format}")
            return parsed.isoformat()
        except ValueError:
            continue

    raise ValueError(f"Unsupported timestamp format: {value!r}")


def build_alert_payload(event, node_name):
    """Translate a Snort alert event into the Flask alert-ingestion schema."""
    if event.get("event_type") not in (None, "alert"):
        return None

    snort_alert = event.get("alert")
    if not isinstance(snort_alert, dict):
        snort_alert = {}

    source_ip = event.get("src_ip") or event.get("source_ip") or event.get("src_addr")
    target_ip = (
        event.get("dest_ip")
        or event.get("dst_ip")
        or event.get("target_ip")
        or event.get("dst_addr")
    )
    attack_type = (
        snort_alert.get("signature")
        or event.get("attack_type")
        or event.get("signature")
        or event.get("msg")
        or event.get("rule")
    )
    if not source_ip or not attack_type:
        raise ValueError("Snort alert is missing a source IP or signature.")

    severity = (
        event.get("severity_level")
        or snort_alert.get("severity")
        or event.get("severity")
        or event.get("priority")
    )
    payload = {
        "node_name": node_name,
        "source_ip": source_ip,
        "attack_type": attack_type,
        "severity_level": _severity_label(severity),
    }
    if target_ip:
        payload["target_ip"] = target_ip
    if isinstance(event.get("timestamp"), str):
        try:
            payload["timestamp"] = _normalize_timestamp(event["timestamp"])
        except ValueError as exc:
            logger.warning("Ignoring unsupported Snort timestamp: %s", exc)
    return payload


def _post_alert_until_sent(url, payload, headers, verify, stop_event):
    retry_seconds = INITIAL_RETRY_SECONDS
    while not stop_event.is_set():
        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                verify=verify,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            if 400 <= response.status_code < 500:
                logger.error(
                    "Hub rejected alert from %s (HTTP %s): %s",
                    payload["node_name"],
                    response.status_code,
                    response.text[:300],
                )
                return
            response.raise_for_status()
            logger.info(
                "Forwarded %s alert from %s",
                payload["source_ip"],
                payload["node_name"],
            )
            return
        except requests.RequestException as exc:
            logger.warning(
                "Could not forward alert (%s); retrying in %s seconds",
                exc,
                retry_seconds,
            )
            stop_event.wait(retry_seconds)
            retry_seconds = min(retry_seconds * 2, MAX_RETRY_SECONDS)


def _send_heartbeat(url, headers, node_name, verify):
    try:
        response = requests.post(
            url,
            json={"node_name": node_name},
            headers=headers,
            verify=verify,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        logger.debug("Heartbeat sent for %s", node_name)
    except requests.RequestException as exc:
        logger.warning("Heartbeat failed for %s: %s", node_name, exc)


def _heartbeat_loop(url, headers, node_name, verify, stop_event):
    while not stop_event.is_set():
        started = time.monotonic()
        _send_heartbeat(url, headers, node_name, verify)
        elapsed = time.monotonic() - started
        stop_event.wait(max(0, HEARTBEAT_INTERVAL_SECONDS - elapsed))


def _process_line(line, node_name, alert_url, headers, verify, stop_event):
    try:
        event = json.loads(line)
    except json.JSONDecodeError as exc:
        logger.warning("Ignoring malformed Snort JSON line: %s", exc)
        return

    if not isinstance(event, dict):
        logger.warning("Ignoring Snort JSON entry that is not an object.")
        return

    try:
        payload = build_alert_payload(event, node_name)
    except ValueError as exc:
        logger.warning("Ignoring incomplete Snort alert: %s", exc)
        return

    if payload is not None:
        _post_alert_until_sent(alert_url, payload, headers, verify, stop_event)


def tail_alert_log(path, node_name, alert_url, headers, verify, stop_event):
    """Follow appended JSON lines, reopening on rotation and truncation."""
    log_file = None
    pending = ""
    initial_open = True
    log_open_issue_reported = False

    try:
        while not stop_event.is_set():
            if log_file is None:
                try:
                    log_file = path.open("r", encoding="utf-8", errors="replace")
                    if initial_open:
                        log_file.seek(0, os.SEEK_END)
                        initial_open = False
                    logger.info("Tailing Snort alert log at %s", path)
                    log_open_issue_reported = False
                except FileNotFoundError:
                    if not log_open_issue_reported:
                        logger.warning("Snort alert log not found at %s; waiting for it", path)
                        log_open_issue_reported = True
                    stop_event.wait(LOG_POLL_INTERVAL_SECONDS)
                    continue
                except OSError as exc:
                    if not log_open_issue_reported:
                        logger.error("Could not open Snort alert log at %s: %s", path, exc)
                        log_open_issue_reported = True
                    stop_event.wait(LOG_POLL_INTERVAL_SECONDS)
                    continue

            try:
                line = log_file.readline()
            except OSError as exc:
                logger.error("Could not read Snort alert log at %s: %s", path, exc)
                log_file.close()
                log_file = None
                pending = ""
                stop_event.wait(LOG_POLL_INTERVAL_SECONDS)
                continue
            if line:
                pending += line
                if pending.endswith("\n"):
                    _process_line(
                        pending.strip(),
                        node_name,
                        alert_url,
                        headers,
                        verify,
                        stop_event,
                    )
                    pending = ""
                continue

            try:
                path_stat = path.stat()
                file_stat = os.fstat(log_file.fileno())
            except FileNotFoundError:
                stop_event.wait(LOG_POLL_INTERVAL_SECONDS)
                continue
            except OSError as exc:
                logger.warning("Could not inspect Snort alert log at %s: %s", path, exc)
                stop_event.wait(LOG_POLL_INTERVAL_SECONDS)
                continue

            if (path_stat.st_dev, path_stat.st_ino) != (file_stat.st_dev, file_stat.st_ino):
                log_file.close()
                log_file = None
                pending = ""
                initial_open = False
                logger.info("Snort alert log rotated; following the new file")
            elif path_stat.st_size < log_file.tell():
                log_file.seek(0)
                pending = ""
                logger.info("Snort alert log truncated; continuing from the start")
            else:
                stop_event.wait(LOG_POLL_INTERVAL_SECONDS)
    finally:
        if log_file is not None:
            log_file.close()


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        config = load_config()
    except RuntimeError as exc:
        logger.error("%s", exc)
        return 1

    try:
        base_url, tls_enabled = _hub_base_url(config["hub_ip"])
        verify = _tls_verify_value(tls_enabled, config["ca_cert"])
    except RuntimeError as exc:
        logger.error("%s", exc)
        return 1

    headers = {"Authorization": f"Bearer {config['api_key']}"}
    alert_url = f"{base_url}/api/alerts"
    heartbeat_url = f"{base_url}/api/nodes/heartbeat"
    stop_event = threading.Event()

    heartbeat_thread = threading.Thread(
        target=_heartbeat_loop,
        args=(heartbeat_url, headers, config["node_name"], verify, stop_event),
        name="diona-heartbeat",
        daemon=True,
    )
    heartbeat_thread.start()

    logger.info("Starting DIONA shipper for node %s at %s", config["node_name"], base_url)
    try:
        tail_alert_log(
            ALERT_LOG_PATH,
            config["node_name"],
            alert_url,
            headers,
            verify,
            stop_event,
        )
    except KeyboardInterrupt:
        logger.info("Stopping DIONA shipper")
    finally:
        stop_event.set()
        heartbeat_thread.join(timeout=REQUEST_TIMEOUT_SECONDS + 1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
