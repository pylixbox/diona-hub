import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///diona.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "9281102360:AAEsEeOYMdkf6eIZrKPw9h1xShDwkCuAWgk")
    TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "7021941973")

    OTX_API_KEY = os.environ.get("OTX_API_KEY", "")

    # A node that hasn't sent an alert/heartbeat within this window is
    # reported "offline" on the dashboard. NFR-01 traceability.
    NODE_STALE_MINUTES = int(os.environ.get("NODE_STALE_MINUTES", 5))
