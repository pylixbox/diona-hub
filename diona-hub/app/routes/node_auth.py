from functools import wraps
import hmac

from flask import current_app, jsonify, request


def node_api_key_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")
        scheme, separator, token = authorization.partition(" ")
        expected_token = current_app.config.get("NODE_API_KEY", "")

        if (
            scheme.lower() != "bearer"
            or not separator
            or not token
            or not expected_token
            or not hmac.compare_digest(token.encode("utf-8"), expected_token.encode("utf-8"))
        ):
            return jsonify({"error": "valid Bearer token required"}), 401

        return view(*args, **kwargs)

    return wrapped
