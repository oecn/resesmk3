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
                ADD COLUMN IF NOT EXISTS peso_promedio_vac NUMERIC(10, 2) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS peso_promedio_tor NUMERIC(10, 2) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS peso_promedio_nov NUMERIC(10, 2) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS peso_promedio_vaq NUMERIC(10, 2) NOT NULL DEFAULT 0
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Peso promedio por tipo de animal aplicado correctamente.")


if __name__ == "__main__":
    main()
