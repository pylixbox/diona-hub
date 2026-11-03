import requests

OTX_BASE_URL = "https://otx.alienvault.com/api/v1/indicators/IPv4"


def enrich_ip(ip, api_key="", timeout=4):
    """
    Look up an IP against AlienVault OTX threat intelligence.
    Returns a dict with pulse_count/flagged, or None if OTX is
    unreachable or the lookup fails. Enrichment is best-effort and
    must NEVER block or fail alert ingestion.
    """
    if not ip:
        return None

    headers = {"X-OTX-API-KEY": api_key} if api_key else {}
    try:
        resp = requests.get(f"{OTX_BASE_URL}/{ip}/general", headers=headers, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException:
        return None

    pulse_count = data.get("pulse_info", {}).get("count", 0)
    return {"otx_pulse_count": pulse_count, "otx_flagged": pulse_count > 0}
