from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from app.config import Config
from app.extensions import db, bcrypt, login_manager, cors


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    cors.init_app(app, supports_credentials=True)

    @login_manager.user_loader
    def load_user(user_id):
        from app.models import User
        return db.session.get(User, int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "authentication required"}), 401

    @app.errorhandler(Exception)
    def handle_unexpected(err):
        """
        Without this, an unhandled error in debug mode returns an HTML
        traceback page with no CORS headers, which the browser reports as a
        vague "NetworkError". Return JSON instead so the dashboard can show
        the real message, and log the full traceback in this terminal.
        """
        if isinstance(err, HTTPException):
            return err  # normal 404 / 405 behaviour
        app.logger.exception("Unhandled error on %s %s", request.method, request.path)
        return jsonify({"error": f"{type(err).__name__}: {err}"}), 500

    from app.routes import register_routes
    register_routes(app)

    with app.app_context():
        db.create_all()

    return app
