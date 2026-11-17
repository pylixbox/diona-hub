import unittest
from unittest.mock import patch

from app import create_app
from app.extensions import db
from app.models import User


class TestConfig:
    SECRET_KEY = "test-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    NODE_API_KEY = "test-node-key"
    NODE_STALE_MINUTES = 5
    TELEGRAM_BOT_TOKEN = ""
    TELEGRAM_CHAT_ID = ""
    TESTING = True


class OtxRemovalTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

        user = User(username="test-user")
        db.session.add(user)
        db.session.commit()
        with self.client.session_transaction() as session:
            session["_user_id"] = str(user.user_id)
            session["_fresh"] = True

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_otx_routes_are_removed(self):
        routes = {rule.rule for rule in self.app.url_map.iter_rules()}

        self.assertNotIn("/api/settings/test-otx", routes)
        self.assertNotIn("/api/alerts/<int:alert_id>/enrich", routes)

    def test_settings_and_stats_no_longer_expose_otx(self):
        settings = self.client.get("/api/settings")
        stats = self.client.get("/api/stats/summary")

        self.assertEqual(
            set(settings.get_json()),
            {"telegram_bot_token", "telegram_chat_id"},
        )
        self.assertNotIn("otx_flagged", stats.get_json())

    def test_alert_ingestion_and_response_do_not_depend_on_otx(self):
        with patch("app.routes.alerts.telegram.send_alert", return_value=True):
            response = self.client.post(
                "/api/alerts",
                headers={"Authorization": "Bearer test-node-key"},
                json={
                    "node_name": "sensor-test",
                    "source_ip": "192.0.2.10",
                    "target_ip": "192.0.2.20",
                    "attack_type": "Controlled integration test",
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertNotIn("otx_pulse_count", response.get_json())
        self.assertNotIn("otx_flagged", response.get_json())


if __name__ == "__main__":
    unittest.main()