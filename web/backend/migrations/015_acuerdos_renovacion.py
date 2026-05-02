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
                ALTER TABLE acuerdos_comerciales
                ADD COLUMN IF NOT EXISTS estado_renovacion TEXT NOT NULL DEFAULT 'vigente'
                """
            )
            cur.execute(
                """
                ALTER TABLE acuerdos_comerciales
                ADD COLUMN IF NOT EXISTS acuerdo_origen_id INTEGER NULL REFERENCES acuerdos_comerciales(id)
                """
            )
            cur.execute(
                """
                ALTER TABLE acuerdos_comerciales
                ADD COLUMN IF NOT EXISTS renovado_por_acuerdo_id INTEGER NULL REFERENCES acuerdos_comerciales(id)
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_acuerdos_comerciales_origen
                ON acuerdos_comerciales(acuerdo_origen_id)
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_acuerdos_comerciales_estado_renovacion
                ON acuerdos_comerciales(estado_renovacion)
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion acuerdos_renovacion aplicada correctamente.")


if __name__ == "__main__":
    main()
