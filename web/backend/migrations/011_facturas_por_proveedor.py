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
            cur.execute("DROP INDEX IF EXISTS uq_cargas_combustible_nro_factura_activa")
            cur.execute("DROP INDEX IF EXISTS uq_gastos_flota_nro_factura")
            cur.execute("DROP INDEX IF EXISTS uq_gastos_flota_nro_factura_activa")
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_cargas_combustible_proveedor_factura_activa
                    ON cargas_combustible (
                        COALESCE(proveedor_id, 0),
                        LOWER(REGEXP_REPLACE(BTRIM(COALESCE(nro_factura, '')), '[[:space:]]+', '', 'g'))
                    )
                    WHERE nro_factura IS NOT NULL
                      AND BTRIM(nro_factura) <> ''
                      AND eliminado_en IS NULL
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_gastos_flota_proveedor_factura_activa
                    ON gastos_flota (
                        (
                            CASE
                                WHEN proveedor_id IS NOT NULL THEN 'id:' || proveedor_id::text
                                WHEN BTRIM(COALESCE(proveedor_ruc, '')) <> '' THEN 'ruc:' || LOWER(REGEXP_REPLACE(BTRIM(COALESCE(proveedor_ruc, '')), '[[:space:]]+', '', 'g'))
                                ELSE 'nombre:' || LOWER(REGEXP_REPLACE(BTRIM(COALESCE(proveedor_nombre, '')), '[[:space:]]+', '', 'g'))
                            END
                        ),
                        LOWER(REGEXP_REPLACE(BTRIM(COALESCE(nro_factura, '')), '[[:space:]]+', '', 'g'))
                    )
                    WHERE nro_factura IS NOT NULL
                      AND BTRIM(nro_factura) <> ''
                      AND eliminado_en IS NULL
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion facturas_por_proveedor aplicada correctamente.")


if __name__ == "__main__":
    main()
