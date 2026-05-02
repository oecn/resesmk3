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
                CREATE TABLE IF NOT EXISTS acuerdos_historial (
                    id SERIAL PRIMARY KEY,
                    acuerdo_id INTEGER NOT NULL REFERENCES acuerdos_comerciales(id) ON DELETE CASCADE,
                    accion TEXT NOT NULL,
                    usuario TEXT NULL,
                    cambios JSONB NOT NULL DEFAULT '[]'::jsonb,
                    anterior JSONB NULL,
                    nuevo JSONB NULL,
                    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_acuerdos_historial_acuerdo
                ON acuerdos_historial(acuerdo_id, creado_en DESC)
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion acuerdos_historial aplicada correctamente.")


if __name__ == "__main__":
    main()
