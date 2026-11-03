from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, current_app, request
from flask_login import login_required
from app.extensions import db
from app.models import Node

bp = Blueprint("nodes", __name__, url_prefix="/api/nodes")


@bp.route("", methods=["GET"])
@login_required
def list_nodes():
    """
    Node health panel. A node is 'offline' if it hasn't checked in
    within NODE_STALE_MINUTES. Check-ins come from the heartbeat
    endpoint below (and from every alert), so a healthy sensor on a
    quiet network still shows online. Status is derived live from the
    timestamp rather than trusting the stored column, which would go
    stale if a node died without a clean shutdown (NFR-01).
    """
    stale_after = timedelta(minutes=current_app.config["NODE_STALE_MINUTES"])
    now = datetime.now(timezone.utc)

    nodes = Node.query.order_by(Node.node_name).all()
    result = []
    for n in nodes:
        last_hb = n.last_heartbeat
        if last_hb and last_hb.tzinfo is None:
            last_hb = last_hb.replace(tzinfo=timezone.utc)
        is_stale = (not last_hb) or (now - last_hb > stale_after)
        result.append({
            "node_id": n.node_id,
            "node_name": n.node_name,
            "ip_address": n.ip_address,
            "location_room": n.location_room,
            "status": "offline" if is_stale else "online",
            "last_heartbeat": last_hb.isoformat() if last_hb else None,
            "alert_count": n.alerts.count(),
        })
    return jsonify(result)


@bp.route("/heartbeat", methods=["POST"])
def heartbeat():
    """
    Called by each observer node every ~30s (eve_shipper.py does this
    automatically). Not gated by @login_required - sensors aren't
    dashboard users. Add a shared node key before real deployment, same
    as the alert ingestion route.
    """
    data = request.get_json(silent=True) or {}
    name = data.get("node_name")
    if not name:
        return jsonify({"error": "missing field: node_name"}), 400

    node = Node.query.filter_by(node_name=name).first()
    if not node:
        node = Node(node_name=name)
        db.session.add(node)

    node.status = "online"
    node.last_heartbeat = datetime.now(timezone.utc)
    node.ip_address = data.get("ip_address") or request.remote_addr
    if data.get("location_room"):
        node.location_room = data["location_room"]
    db.session.commit()
    return jsonify({"ok": True})
