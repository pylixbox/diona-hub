import requests

SEVERITY_EMOJI = {"High": "\U0001F534", "Medium": "\U0001F7E0", "Low": "\U0001F7E1"}


def _build_text(alert):
    emoji = SEVERITY_EMOJI.get(alert.get("severity_level"), "\u26AA")
    otx_line = ""
    if alert.get("otx_flagged"):
        otx_line = f"\n\U0001F6E1 OTX: seen in {alert.get('otx_pulse_count')} threat pulse(s)"

    return (
        f"{emoji} *DIONA Alert - {alert.get('severity_level', 'Unknown')}*\n"
        f"Node: `{alert.get('node_name', 'unknown')}`\n"
        f"Type: {alert.get('attack_type')}\n"
        f"Source: `{alert.get('source_ip')}` -> Target: `{alert.get('target_ip')}`\n"
        f"Time: {alert.get('timestamp')}"
        f"{otx_line}"
    )


def _post(token, chat_id, text, markdown):
    payload = {"chat_id": chat_id, "text": text}
    if markdown:
        payload["parse_mode"] = "Markdown"
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        resp = requests.post(url, json=payload, timeout=8)
    except requests.RequestException as exc:
        return False, f"Could not reach Telegram ({exc.__class__.__name__})"
    if resp.ok:
        return True, ""
    try:
        detail = resp.json().get("description") or resp.text
    except ValueError:
        detail = resp.text
    return False, detail


def send_alert_detailed(bot_token, chat_id, alert):
    """
    Returns (ok, detail). Telegram's legacy Markdown rejects stray
    characters such as an underscore in a rule name; if that happens,
    resend as plain text instead of losing the alert.
    """
    if not bot_token or not chat_id:
        return False, "Bot token and chat ID are both required."
    text = _build_text(alert)
    ok, detail = _post(bot_token, chat_id, text, markdown=True)
    if not ok and "parse entities" in detail.lower():
        ok, detail = _post(bot_token, chat_id, text.replace("*", "").replace("`", ""), markdown=False)
    return ok, detail


def send_alert(bot_token, chat_id, alert):
    """Best-effort: a Telegram failure must never block or roll back the stored alert."""
    return send_alert_detailed(bot_token, chat_id, alert)[0]
