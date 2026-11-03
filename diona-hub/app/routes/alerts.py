from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from app.extensions import db
from app.models import Alert, Node
from app.services import otx, telegram
from app.services.settings_store import get_setting

bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")


@bp.route("", methods=["POST"])
def ingest_alert():
    """
    FR-02 / FR-04 ingestion endpoint. Called by eve_shipper.py (or the
    Chapter 3 simulator during the transition period). Not gated by
    @login_required - Observer nodes aren't logged-in dashboard users.
    Add a shared node API key before real deployment; left open for
    the dev/VM phase.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "invalid or missing JSON body"}), 400

    required = ["node_name", "source_ip", "attack_type"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"missing fields: {missing}"}), 400

    node = Node.query.filter_by(node_name=data["node_name"]).first()
    if not node:
        # Auto-register unseen nodes rather than dropping their alerts,
        # to stay frictionless during the dev/VM phase. Tighten this
        # once real Pi nodes are provisioned deliberately (FR-01).
        node = Node(node_name=data["node_name"], status="online")
        db.session.add(node)
        db.session.flush()

    node.status = "online"
    node.last_heartbeat = datetime.now(timezone.utc)

    alert = Alert(
        node_id=node.node_id,
        source_ip=data["source_ip"],
        target_ip=data.get("target_ip"),
        attack_type=data["attack_type"],
        severity_level=data.get("severity_level", "Medium"),
    )
    if data.get("timestamp"):
        try:
            alert.timestamp = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
        except ValueError:
            pass

    enrichment = otx.enrich_ip(
        data["source_ip"],
        api_key=get_setting("otx_api_key", current_app.config["OTX_API_KEY"]),
    )
    if enrichment:
        alert.otx_pulse_count = enrichment["otx_pulse_count"]
        alert.otx_flagged = enrichment["otx_flagged"]

    db.session.add(alert)
    db.session.commit()

    notification_sent = telegram.send_alert(
        get_setting("telegram_bot_token", current_app.config["TELEGRAM_BOT_TOKEN"]),
        get_setting("telegram_chat_id", current_app.config["TELEGRAM_CHAT_ID"]),
        alert.to_dict(),
    )
    if not notification_sent:
        current_app.logger.warning("Telegram notification failed for alert %s", alert.alert_id)

    return jsonify(alert.to_dict()), 201


@bp.route("", methods=["GET"])
@login_required
def list_alerts():
    """
    Dashboard-facing: paginated, filterable alert history. Backs both
    the live polling table and the Chapter 4 forensic/history view.
    """
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 25, type=int), 200)
    severity = request.args.get("severity")
    attack_type = request.args.get("attack_type")
    node_id = request.args.get("node_id", type=int)

    query = Alert.query.order_by(Alert.timestamp.desc())
    if severity:
        query = query.filter(Alert.severity_level == severity)
    if attack_type:
        query = query.filter(Alert.attack_type.ilike(f"%{attack_type}%"))
    if node_id:
        query = query.filter(Alert.node_id == node_id)

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [a.to_dict() for a in paginated.items],
        "page": paginated.page,
        "pages": paginated.pages,
        "total": paginated.total,
    })


@bp.route("/<int:alert_id>/enrich", methods=["POST"])
@login_required
def enrich_alert(alert_id):
    alert = db.session.get(Alert, alert_id)
    if not alert:
        return jsonify({"error": "alert not found"}), 404

    api_key = get_setting("otx_api_key", current_app.config["OTX_API_KEY"])
    if not api_key:
        return jsonify({"error": "OTX API key is not configured. Add it in Settings and try again."}), 400

    enrichment, error = otx.enrich_ip_detailed(alert.source_ip, api_key=api_key)
    if not enrichment:
        return jsonify({"error": error}), 502

    alert.otx_pulse_count = enrichment["otx_pulse_count"]
    alert.otx_flagged = enrichment["otx_flagged"]
    db.session.commit()
    return jsonify(alert.to_dict())
