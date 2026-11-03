from datetime import datetime, timezone
from flask_login import UserMixin
from app.extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model, UserMixin):
    __tablename__ = "user"

    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)
    role = db.Column(db.String(32), default="IT Staff")
    last_login = db.Column(db.DateTime, nullable=True)

    def get_id(self):
        # Flask-Login expects a string id; our PK is an int.
        return str(self.user_id)


class Node(db.Model):
    __tablename__ = "node"

    node_id = db.Column(db.Integer, primary_key=True)
    node_name = db.Column(db.String(64), unique=True, nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)
    location_room = db.Column(db.String(64), nullable=True)
    status = db.Column(db.String(16), default="unknown")
    last_heartbeat = db.Column(db.DateTime, nullable=True)

    alerts = db.relationship("Alert", backref="node", lazy="dynamic")


class Alert(db.Model):
    __tablename__ = "alert"

    alert_id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey("node.node_id"), nullable=False)
    source_ip = db.Column(db.String(45), nullable=False)
    target_ip = db.Column(db.String(45), nullable=True)
    attack_type = db.Column(db.String(128), nullable=False)
    severity_level = db.Column(db.String(16), default="Medium")
    timestamp = db.Column(db.DateTime, default=utcnow)

    # Extension beyond the approved ERD (Figure 3-7) for OTX enrichment.
    # Flag this as an added column in Chapter 4, or fold it into an
    # updated ERD before the panel sees it.
    otx_pulse_count = db.Column(db.Integer, nullable=True)
    otx_flagged = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "alert_id": self.alert_id,
            "node_id": self.node_id,
            "node_name": self.node.node_name if self.node else None,
            "source_ip": self.source_ip,
            "target_ip": self.target_ip,
            "attack_type": self.attack_type,
            "severity_level": self.severity_level,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "otx_pulse_count": self.otx_pulse_count,
            "otx_flagged": self.otx_flagged,
        }


class Setting(db.Model):
    """
    UI-configurable overrides for values that would otherwise only
    live in .env (Telegram token/chat ID, OTX key). Not part of the
    approved ERD - a new table, not just new columns, so it needs its
    own mention in Chapter 4 alongside the Alert table's OTX columns.
    """
    __tablename__ = "setting"

    key = db.Column(db.String(64), primary_key=True)
    value = db.Column(db.Text, nullable=True)
