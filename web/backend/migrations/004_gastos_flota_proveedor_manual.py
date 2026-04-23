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
                ALTER TABLE gastos_flota
                ADD COLUMN IF NOT EXISTS proveedor_nombre TEXT,
                ADD COLUMN IF NOT EXISTS proveedor_ruc TEXT
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion gastos_flota_proveedor_manual aplicada correctamente.")


if __name__ == "__main__":
    main()
