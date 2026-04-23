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
                ALTER TABLE lotes
                ADD COLUMN IF NOT EXISTS cerrado BOOLEAN NOT NULL DEFAULT FALSE
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion lote_cerrado aplicada correctamente.")


if __name__ == "__main__":
    main()
