"""Drop and recreate all DIONA tables in the configured PostgreSQL database."""
import os

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

from app import create_app
from app.extensions import db


def main():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("Set DATABASE_URL to the PostgreSQL database before resetting.")

    try:
        url = make_url(database_url)
    except ArgumentError:
        raise SystemExit("DATABASE_URL is not a valid SQLAlchemy database URL.") from None

    if url.get_backend_name() != "postgresql":
        raise SystemExit("Refusing to reset a non-PostgreSQL database.")

    app = create_app()
    database_name = url.database or "(unnamed)"
    print(f"Dropping and recreating DIONA tables in PostgreSQL database {database_name!r}...")
    with app.app_context():
        db.metadata.drop_all(bind=db.engine)
        db.metadata.create_all(bind=db.engine)

    print(f"Database reset complete for {database_name!r}.")


if __name__ == "__main__":
    main()
