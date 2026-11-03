from app.routes import alerts, nodes, stats, auth, settings


def register_routes(app):
    app.register_blueprint(alerts.bp)
    app.register_blueprint(nodes.bp)
    app.register_blueprint(stats.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(settings.bp)
