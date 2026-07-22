"""Create the lab_booking database if credentials in .env are valid."""

import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pymysql
from app.core.config import get_settings


def main() -> int:
    settings = get_settings()
    parsed = urlparse(settings.database_url.replace("mysql+pymysql://", "mysql://", 1))
    user = parsed.username or "root"
    password = unquote(parsed.password or "")
    host = parsed.hostname or "localhost"
    port = parsed.port or 3306
    database = (parsed.path or "/lab_booking").lstrip("/")

    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            connect_timeout=5,
        )
    except pymysql.err.OperationalError as exc:
        print(f"Cannot connect to MySQL: {exc}")
        print(
            "Update DATABASE_URL in backend/.env, e.g.\n"
            "DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/lab_booking"
        )
        return 1

    with conn:
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4")
        conn.commit()
    print(f"Database `{database}` is ready.")
    print("Next: python -m alembic upgrade head && python scripts/seed_technicians.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
