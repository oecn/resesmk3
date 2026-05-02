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
                CREATE TABLE IF NOT EXISTS acuerdos_proveedores (
                    id SERIAL PRIMARY KEY,
                    nombre TEXT NOT NULL,
                    ruc TEXT NULL,
                    telefono TEXT NULL,
                    email TEXT NULL,
                    activo BOOLEAN NOT NULL DEFAULT TRUE,
                    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_acuerdos_proveedores_nombre_ruc
                ON acuerdos_proveedores (
                    LOWER(BTRIM(nombre)),
                    LOWER(BTRIM(COALESCE(ruc, '')))
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS acuerdos_comerciales (
                    id SERIAL PRIMARY KEY,
                    proveedor_id INTEGER NOT NULL REFERENCES acuerdos_proveedores(id),
                    titulo TEXT NOT NULL,
                    retorno_porcentaje NUMERIC(8, 3) NOT NULL DEFAULT 0,
                    vigencia_desde DATE NULL,
                    vigencia_hasta DATE NULL,
                    observaciones TEXT NULL,
                    activo BOOLEAN NOT NULL DEFAULT TRUE,
                    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_acuerdos_comerciales_proveedor
                ON acuerdos_comerciales(proveedor_id)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS acuerdos_ubicaciones (
                    id SERIAL PRIMARY KEY,
                    acuerdo_id INTEGER NOT NULL REFERENCES acuerdos_comerciales(id) ON DELETE CASCADE,
                    sucursal TEXT NOT NULL,
                    tipo_espacio TEXT NOT NULL,
                    ubicacion TEXT NOT NULL,
                    detalle TEXT NULL,
                    orden INTEGER NOT NULL DEFAULT 1
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_acuerdos_ubicaciones_acuerdo
                ON acuerdos_ubicaciones(acuerdo_id)
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Migracion acuerdos_comerciales aplicada correctamente.")


if __name__ == "__main__":
    main()
