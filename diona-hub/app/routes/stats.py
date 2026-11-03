from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request
from flask_login import login_required
from sqlalchemy import func
from app.extensions import db
from app.models import Alert

bp = Blueprint("stats", __name__, url_prefix="/api/stats")
PHILIPPINES_TIMEZONE = timezone(timedelta(hours=8), name="PHT")


@bp.route("/summary", methods=["GET"])
@login_required
def summary():
    """
    Aggregates for the dashboard: KPI totals (with the prior period for
    comparison), counts by attack type and severity, and a zero-filled
    per-day, per-severity trend. func.date() works on both SQLite (dev)
    and MariaDB (production).
    """
    days = request.args.get("days", 7, type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    by_type = (
        db.session.query(Alert.attack_type, func.count(Alert.alert_id))
        .filter(Alert.timestamp >= since)
        .group_by(Alert.attack_type)
        .order_by(func.count(Alert.alert_id).desc())
        .all()
    )
    by_severity = (
        db.session.query(Alert.severity_level, func.count(Alert.alert_id))
        .filter(Alert.timestamp >= since)
        .group_by(Alert.severity_level)
        .all()
    )

    total = sum(c for _, c in by_severity)
    prev_total = (
        db.session.query(func.count(Alert.alert_id))
        .filter(Alert.timestamp >= since - timedelta(days=days), Alert.timestamp < since)
        .scalar()
        or 0
    )
    unique_sources = (
        db.session.query(func.count(func.distinct(Alert.source_ip)))
        .filter(Alert.timestamp >= since)
        .scalar()
        or 0
    )
    otx_flagged = (
        db.session.query(func.count(Alert.alert_id))
        .filter(Alert.timestamp >= since, Alert.otx_flagged.is_(True))
        .scalar()
        or 0
    )

    # Bucket timestamps by Philippine calendar date for the dashboard trend.
    raw = (
        db.session.query(Alert.timestamp, Alert.severity_level)
        .filter(Alert.timestamp >= since)
        .all()
    )
    by_date = {}
    for timestamp, severity in raw:
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        date_key = timestamp.astimezone(PHILIPPINES_TIMEZONE).date().isoformat()
        counts = by_date.setdefault(date_key, {"High": 0, "Medium": 0, "Low": 0})
        if severity in counts:
            counts[severity] += 1

    today = datetime.now(PHILIPPINES_TIMEZONE).date()
    by_day = []
    for offset in range(days - 1, -1, -1):
        date_str = (today - timedelta(days=offset)).isoformat()
        counts = by_date.get(date_str, {"High": 0, "Medium": 0, "Low": 0})
        by_day.append({
            "date": date_str,
            "High": counts.get("High", 0),
            "Medium": counts.get("Medium", 0),
            "Low": counts.get("Low", 0),
        })

    return jsonify({
        "total": total,
        "prev_total": prev_total,
        "unique_sources": unique_sources,
        "otx_flagged": otx_flagged,
        "by_attack_type": [{"attack_type": t, "count": c} for t, c in by_type],
        "by_severity": [{"severity": s, "count": c} for s, c in by_severity],
        "by_day": by_day,
    })


@bp.route("/top-sources", methods=["GET"])
@login_required
def top_sources():
    """
    Most active source IPs by alert count, plus the worst severity seen
    from each, so the list can be colored by danger, not just volume.
    """
    days = request.args.get("days", 7, type=int)
    limit = min(request.args.get("limit", 10, type=int), 50)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.session.query(Alert.source_ip, Alert.severity_level, func.count(Alert.alert_id))
        .filter(Alert.timestamp >= since)
        .group_by(Alert.source_ip, Alert.severity_level)
        .all()
    )

    rank = {"High": 3, "Medium": 2, "Low": 1}
    by_ip = {}
    for ip, sev, c in rows:
        entry = by_ip.setdefault(ip, {"source_ip": ip, "count": 0, "worst_severity": "Low"})
        entry["count"] += c
        if rank.get(sev, 0) > rank.get(entry["worst_severity"], 0):
            entry["worst_severity"] = sev

    ranked = sorted(by_ip.values(), key=lambda r: r["count"], reverse=True)[:limit]
    return jsonify(ranked)
