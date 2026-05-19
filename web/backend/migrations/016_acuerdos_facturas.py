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
                CREATE TABLE IF NOT EXISTS acuerdos_facturas (
                    id SERIAL PRIMARY KEY,
                    acuerdo_id INTEGER NOT NULL REFERENCES acuerdos_comerciales(id) ON DELETE CASCADE,
                    periodo_anho INTEGER NOT NULL,
                    periodo_mes INTEGER NOT NULL,
                    numero_factura TEXT NOT NULL,
                    monto_factura NUMERIC(14, 2) NOT NULL DEFAULT 0,
                    fecha_factura DATE NULL,
                    cobrado BOOLEAN NOT NULL DEFAULT FALSE,
                    fecha_cobro DATE NULL,
                    observaciones TEXT NULL,
                    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                    CONSTRAINT chk_acuerdos_facturas_periodo_mes CHECK (periodo_mes BETWEEN 1 AND 12),
                    CONSTRAINT uq_acuerdos_facturas_periodo UNIQUE (acuerdo_id, periodo_anho, periodo_mes)
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_acuerdos_facturas_periodo
                ON acuerdos_facturas(periodo_anho, periodo_mes)
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_acuerdos_facturas_cobrado
                ON acuerdos_facturas(cobrado)
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion acuerdos_facturas aplicada correctamente.")


if __name__ == "__main__":
    main()
