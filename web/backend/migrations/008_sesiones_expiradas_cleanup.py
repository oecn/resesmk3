from __future__ import annotations

import sys
from pathlib import Path

import psycopg2

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from web.backend.config import DATABASE_URL


def run_migration(db_url: str) -> None:
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sesiones_expira_en
                ON sesiones(expira_en)
                """
            )
            cur.execute(
                """
                DELETE FROM sesiones
                WHERE expira_en < NOW() - INTERVAL '30 days'
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion sesiones_expiradas_cleanup aplicada correctamente.")


if __name__ == "__main__":
    main()
