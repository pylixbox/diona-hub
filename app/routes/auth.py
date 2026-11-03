from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app.extensions import db, bcrypt
from app.models import User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "")
    password = data.get("password", "")

    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid username or password"}), 401

    login_user(user)
    user.last_login = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"user_id": user.user_id, "username": user.username, "role": user.role})


@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"ok": True})


@bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({
        "user_id": current_user.user_id,
        "username": current_user.username,
        "role": current_user.role,
    })
