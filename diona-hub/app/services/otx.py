import requests

OTX_BASE_URL = "https://otx.alienvault.com/api/v1/indicators/IPv4"
OTX_TIMEOUT_SECONDS = 10
OTX_INGEST_TIMEOUT_SECONDS = 4


def enrich_ip_detailed(ip, api_key="", timeout=OTX_TIMEOUT_SECONDS):
    """
    Look up an IP against AlienVault OTX threat intelligence.
    Returns (enrichment, error). Errors never include the API key or response body.
    """
    if not ip:
        return None, "The alert has no source IP to look up."
    if not api_key:
        return None, "OTX API key is not configured. Add it in Settings and try again."

    headers = {"X-OTX-API-KEY": api_key}
    try:
        resp = requests.get(f"{OTX_BASE_URL}/{ip}/general", headers=headers, timeout=timeout)
        resp.raise_for_status()
    except requests.Timeout:
        return None, f"OTX request timed out after {timeout} seconds."
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        if status in (401, 403):
            return None, f"OTX rejected the API key (HTTP {status}). Check the key saved in Settings."
        return None, f"OTX returned HTTP {status}."
    except requests.RequestException as exc:
        return None, f"Could not reach OTX ({type(exc).__name__})."

    try:
        data = resp.json()
    except ValueError:
        return None, "OTX returned an invalid response."
    if not isinstance(data, dict):
        return None, "OTX returned an invalid response."

    pulse_count = data.get("pulse_info", {}).get("count", 0)
    return {"otx_pulse_count": pulse_count, "otx_flagged": pulse_count > 0}, None


def enrich_ip(ip, api_key="", timeout=OTX_INGEST_TIMEOUT_SECONDS):
    """Best-effort enrichment for ingestion; failures do not block alert storage."""
    enrichment, _ = enrich_ip_detailed(ip, api_key=api_key, timeout=timeout)
    return enrichment
