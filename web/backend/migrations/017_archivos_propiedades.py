from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import psycopg2

from web.backend.config import DATABASE_URL


def main():
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS archivos_propiedades (
                    id SERIAL PRIMARY KEY,
                    local TEXT NOT NULL,
                    local_otro TEXT NULL,
                    otorgado_por TEXT NOT NULL,
                    a_favor_de TEXT NOT NULL,
                    monto NUMERIC(18, 2) NULL,
                    cuenta_catastral TEXT NULL,
                    numero_finca TEXT NULL,
                    bibliorato TEXT NULL,
                    fecha DATE NULL,
                    mes_anho TEXT NULL,
                    descripcion_ubicacion TEXT NULL,
                    observaciones TEXT NULL,
                    activo BOOLEAN NOT NULL DEFAULT TRUE,
                    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                ALTER TABLE archivos_propiedades
                ADD COLUMN IF NOT EXISTS bibliorato TEXT NULL
                """
            )
            cur.execute(
                """
                ALTER TABLE archivos_propiedades
                ADD COLUMN IF NOT EXISTS mes_anho TEXT NULL
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_archivos_propiedades_local
                ON archivos_propiedades(local, activo)
                """
            )
        conn.commit()
    print("Migracion 017_archivos_propiedades aplicada.")


if __name__ == "__main__":
    main()
