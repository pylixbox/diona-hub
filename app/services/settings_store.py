from sqlalchemy.exc import OperationalError, ProgrammingError
from app.extensions import db
from app.models import Setting


def _recover():
    """The `setting` table is new; create it on the spot if startup missed it."""
    db.session.rollback()
    db.create_all()


def get_setting(key, fallback=""):
    """
    DB-backed settings take priority over environment/.env defaults, so
    changes made from the Settings page take effect immediately - no
    server restart needed. Falls back to `fallback` (typically the .env
    value) if nothing's been saved through the UI yet.
    """
    try:
        row = db.session.get(Setting, key)
    except (OperationalError, ProgrammingError):
        _recover()
        row = db.session.get(Setting, key)
    if row and row.value:
        return row.value
    return fallback


def set_setting(key, value):
    try:
        row = db.session.get(Setting, key)
    except (OperationalError, ProgrammingError):
        _recover()
        row = db.session.get(Setting, key)
    if row:
        row.value = value
    else:
        db.session.add(Setting(key=key, value=value))
    db.session.commit()
