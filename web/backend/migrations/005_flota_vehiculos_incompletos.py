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
                ALTER TABLE vehiculos
                ALTER COLUMN codigo DROP NOT NULL,
                ALTER COLUMN chapa DROP NOT NULL
                """
            )
            cur.execute("UPDATE vehiculos SET codigo = NULL WHERE BTRIM(COALESCE(codigo, '')) = ''")
            cur.execute("UPDATE vehiculos SET chapa = NULL WHERE BTRIM(COALESCE(chapa, '')) = ''")
            cur.execute("ALTER TABLE vehiculos DROP CONSTRAINT IF EXISTS vehiculos_codigo_key")
            cur.execute("ALTER TABLE vehiculos DROP CONSTRAINT IF EXISTS vehiculos_chapa_key")
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_vehiculos_codigo_present
                ON vehiculos ((UPPER(BTRIM(codigo))))
                WHERE codigo IS NOT NULL AND BTRIM(codigo) <> ''
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_vehiculos_chapa_present
                ON vehiculos ((UPPER(BTRIM(chapa))))
                WHERE chapa IS NOT NULL AND BTRIM(chapa) <> ''
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion flota_vehiculos_incompletos aplicada correctamente.")


if __name__ == "__main__":
    main()
