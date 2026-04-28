from __future__ import annotations

import sys
from pathlib import Path

import psycopg2

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from web.backend.config import DATABASE_URL


LEGACY_TABLES = (
    ("menudencias_aregua", "Aregua"),
    ("menudencias_luque", "Luque"),
    ("menudencias_itaugua", "Itaugua"),
)


def run_migration(db_url: str) -> None:
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS menudencias (
                    id SERIAL PRIMARY KEY,
                    sucursal TEXT NOT NULL,
                    fecha DATE NOT NULL,
                    producto TEXT NOT NULL,
                    kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
                    unidades INTEGER NOT NULL DEFAULT 0,
                    legacy_id INTEGER NULL,
                    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                    CONSTRAINT menudencias_sucursal_check
                        CHECK (sucursal IN ('Aregua', 'Luque', 'Itaugua')),
                    CONSTRAINT menudencias_valores_check
                        CHECK (kg >= 0 AND unidades >= 0)
                )
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_menudencias_sucursal_legacy
                ON menudencias(sucursal, legacy_id)
                WHERE legacy_id IS NOT NULL
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_menudencias_sucursal_fecha
                ON menudencias(sucursal, fecha DESC)
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_menudencias_producto
                ON menudencias(LOWER(TRIM(producto)))
                """
            )

            for table_name, sucursal in LEGACY_TABLES:
                cur.execute("SELECT to_regclass(%s)", (table_name,))
                if cur.fetchone()[0] is None:
                    continue
                cur.execute(
                    f"""
                    INSERT INTO menudencias(sucursal, fecha, producto, kg, unidades, legacy_id)
                    SELECT %s,
                           fecha,
                           COALESCE(NULLIF(TRIM(producto), ''), 'Sin producto') AS producto,
                           COALESCE(kg, 0),
                           COALESCE(unidades, 0),
                           id
                    FROM {table_name}
                    ON CONFLICT (sucursal, legacy_id)
                    WHERE legacy_id IS NOT NULL
                    DO UPDATE
                    SET fecha = EXCLUDED.fecha,
                        producto = EXCLUDED.producto,
                        kg = EXCLUDED.kg,
                        unidades = EXCLUDED.unidades
                    """,
                    (sucursal,),
                )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion menudencias_unificadas aplicada correctamente.")


if __name__ == "__main__":
    main()
