from __future__ import annotations

import sys
from pathlib import Path

import psycopg2

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from web.backend.config import DATABASE_URL


SQL_PATH = Path(__file__).with_suffix(".sql")


def run_migration(db_url: str) -> None:
    sql = SQL_PATH.read_text(encoding="utf-8")
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion flota_base aplicada correctamente.")


if __name__ == "__main__":
    main()
