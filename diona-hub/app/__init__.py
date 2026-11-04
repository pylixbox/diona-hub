import click
import sqlite3
from pathlib import Path
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from app.config import Config
from app.extensions import db, bcrypt, login_manager, cors


def _bootstrap_demo_database(app):
    if app.config["SQLALCHEMY_DATABASE_URI"] != "sqlite:///diona.db":
        return

    demo_database = Path(app.root_path).parent / "demo_data.db"
    local_database = Path(app.instance_path) / "diona.db"
    if not demo_database.is_file():
        return

    try:
        with sqlite3.connect(local_database) as connection:
            if connection.execute("SELECT 1 FROM alert LIMIT 1").fetchone():
                return

            connection.execute("ATTACH DATABASE ? AS demo", (str(demo_database),))
            connection.execute(
                """
                INSERT OR IGNORE INTO main.node
                    (node_name, ip_address, location_room, status, last_heartbeat)
                SELECT node_name, ip_address, location_room, status, last_heartbeat
                FROM demo.node
                """
            )
            connection.execute(
                """
                INSERT INTO main.alert
                    (node_id, source_ip, target_ip, attack_type, severity_level,
                     timestamp, otx_pulse_count, otx_flagged)
                SELECT local_node.node_id, demo_alert.source_ip, demo_alert.target_ip,
                       demo_alert.attack_type, demo_alert.severity_level, demo_alert.timestamp,
                       demo_alert.otx_pulse_count, demo_alert.otx_flagged
                FROM demo.alert AS demo_alert
                JOIN demo.node AS demo_node ON demo_node.node_id = demo_alert.node_id
                JOIN main.node AS local_node ON local_node.node_name = demo_node.node_name
                """
            )
            imported = connection.execute("SELECT COUNT(*) FROM main.alert").fetchone()[0]
    except sqlite3.Error:
        app.logger.warning("Could not import sanitized demo data into the local database.")
        return

    if imported:
        app.logger.info("Imported %s sanitized demo alerts into the empty local alert history.", imported)


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

    @app.cli.command("set-admin-password")
    @click.option("--username", default="admin", show_default=True)
    def set_admin_password(username):
        """Create an account or reset its password using a hidden prompt."""
        from app.models import User

        user = User.query.filter_by(username=username).first()
        if not user:
            user = User(username=username, role="IT Expert")
            db.session.add(user)

        password = click.prompt("New password", hide_input=True, confirmation_prompt=True)
        user.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        db.session.commit()
        click.echo(f"Password updated for {username}.")

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
        _bootstrap_demo_database(app)

    return app
