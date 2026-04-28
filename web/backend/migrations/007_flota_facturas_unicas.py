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
                ALTER TABLE cargas_combustible
                ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMP NULL,
                ADD COLUMN IF NOT EXISTS eliminado_por TEXT NULL,
                ADD COLUMN IF NOT EXISTS motivo_eliminacion TEXT NULL
                """
            )
            cur.execute(
                """
                DO $$
                DECLARE
                    dup RECORD;
                BEGIN
                    SELECT normalized, COUNT(*) AS total
                    INTO dup
                    FROM (
                        SELECT LOWER(REGEXP_REPLACE(BTRIM(COALESCE(nro_factura, '')), '[[:space:]]+', '', 'g')) AS normalized
                        FROM cargas_combustible
                        WHERE nro_factura IS NOT NULL
                          AND BTRIM(nro_factura) <> ''
                          AND eliminado_en IS NULL
                    ) facturas
                    GROUP BY normalized
                    HAVING COUNT(*) > 1
                    LIMIT 1;

                    IF FOUND THEN
                        RAISE EXCEPTION 'Existen facturas duplicadas activas en combustible: % (% registros). Limpia los duplicados antes de aplicar esta migracion.', dup.normalized, dup.total;
                    END IF;
                END $$;
                """
            )
            cur.execute(
                """
                DO $$
                DECLARE
                    dup RECORD;
                BEGIN
                    SELECT normalized, COUNT(*) AS total
                    INTO dup
                    FROM (
                        SELECT LOWER(REGEXP_REPLACE(BTRIM(COALESCE(nro_factura, '')), '[[:space:]]+', '', 'g')) AS normalized
                        FROM gastos_flota
                        WHERE nro_factura IS NOT NULL
                          AND BTRIM(nro_factura) <> ''
                    ) facturas
                    GROUP BY normalized
                    HAVING COUNT(*) > 1
                    LIMIT 1;

                    IF FOUND THEN
                        RAISE EXCEPTION 'Existen facturas duplicadas en gastos de flota: % (% registros). Limpia los duplicados antes de aplicar esta migracion.', dup.normalized, dup.total;
                    END IF;
                END $$;
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_cargas_combustible_nro_factura_activa
                    ON cargas_combustible (LOWER(REGEXP_REPLACE(BTRIM(COALESCE(nro_factura, '')), '[[:space:]]+', '', 'g')))
                    WHERE nro_factura IS NOT NULL AND BTRIM(nro_factura) <> '' AND eliminado_en IS NULL
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_gastos_flota_nro_factura
                    ON gastos_flota (LOWER(REGEXP_REPLACE(BTRIM(COALESCE(nro_factura, '')), '[[:space:]]+', '', 'g')))
                    WHERE nro_factura IS NOT NULL AND BTRIM(nro_factura) <> ''
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion flota_facturas_unicas aplicada correctamente.")


if __name__ == "__main__":
    main()
