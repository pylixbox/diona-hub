from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from app.services.settings_store import get_setting, set_setting
from app.services import telegram

bp = Blueprint("settings", __name__, url_prefix="/api/settings")

KEYS = {
    "telegram_bot_token": "9281102360:AAEsEeOYMdkf6eIZrKPw9h1xShDwkCuAWgk",
    "telegram_chat_id": "7021941973",
    "otx_api_key": "OTX_API_KEY",
}

# Most specific first ("chat not found" must be checked before "not found").
HINTS = [
    ("unauthorized", "The bot token is wrong or was revoked. Copy it again from @BotFather."),
    ("chat not found", "Telegram can't find that chat ID. Message your bot once, then re-check getUpdates."),
    ("forbidden", "The bot can't message that chat. Open your bot in Telegram and press Start."),
    ("not found", "Telegram doesn't recognise that bot token. Copy it again from @BotFather."),
]


def _mask(value):
    if not value:
        return ""
    if len(value) <= 4:
        return "*" * len(value)
    return "*" * (len(value) - 4) + value[-4:]


@bp.route("", methods=["GET"])
@login_required
def read_settings():
    """Whether each value is configured, plus a masked preview - never the full secret."""
    result = {}
    for db_key, config_key in KEYS.items():
        value = get_setting(db_key, current_app.config.get(config_key, ""))
        result[db_key] = {"configured": bool(value), "masked": _mask(value)}
    return jsonify(result)


@bp.route("", methods=["POST"])
@login_required
def write_settings():
    data = request.get_json(silent=True) or {}
    for db_key in KEYS:
        # Pasted tokens often carry a trailing space or newline, which breaks the URL.
        value = str(data.get(db_key) or "").strip()
        if value:
            set_setting(db_key, value)
    return jsonify({"ok": True})


@bp.route("/test-telegram", methods=["POST"])
@login_required
def test_telegram():
    token = get_setting("telegram_bot_token", current_app.config["TELEGRAM_BOT_TOKEN"])
    chat_id = get_setting("telegram_chat_id", current_app.config["TELEGRAM_CHAT_ID"])

    ok, detail = telegram.send_alert_detailed(token, chat_id, {
        "severity_level": "Low",
        "node_name": "settings-test",
        "attack_type": "Test notification from DIONA Settings",
        "source_ip": "0.0.0.0",
        "target_ip": "0.0.0.0",
        "timestamp": "just now",
    })
    if ok:
        return jsonify({"ok": True})

    hint = next((h for needle, h in HINTS if needle in detail.lower()), "")
    return jsonify({"error": f"Telegram said: {detail}. {hint}".strip()}), 400
