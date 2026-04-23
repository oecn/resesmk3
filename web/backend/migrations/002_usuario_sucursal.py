from __future__ import annotations

import sys
from pathlib import Path

import psycopg2

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from web.backend.config import DATABASE_URL


VALID_SUCURSALES = {"aregua", "luque", "itaugua"}


def run_migration(db_url: str) -> None:
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                ALTER TABLE usuarios
                ADD COLUMN IF NOT EXISTS sucursal_permitida TEXT NULL
                """
            )
            cur.execute(
                """
                UPDATE usuarios
                SET sucursal_permitida = NULL
                WHERE rol_id IN (
                    SELECT id FROM roles WHERE nombre IN ('admin', 'supervisor')
                )
                """
            )
            cur.execute(
                """
                ALTER TABLE usuarios
                DROP CONSTRAINT IF EXISTS usuarios_sucursal_permitida_check
                """
            )
            cur.execute(
                """
                ALTER TABLE usuarios
                ADD CONSTRAINT usuarios_sucursal_permitida_check
                CHECK (
                    sucursal_permitida IS NULL
                    OR sucursal_permitida IN ('aregua', 'luque', 'itaugua')
                )
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion usuario_sucursal aplicada correctamente.")


if __name__ == "__main__":
    main()
