from __future__ import annotations

import psycopg2
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[3]))

from web.backend.config import DATABASE_URL
from web.backend.modules.contratos.repository import ContratosRepository


def main():
    ContratosRepository(DATABASE_URL)._ensure_schema()
    with psycopg2.connect(DATABASE_URL, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO contratos (
                    inicio_contrato,
                    duracion_meses,
                    contexto,
                    clausulas_importantes,
                    monto_contrato,
                    ofrece_contrato,
                    contratante,
                    nombre_documento,
                    tipo_documento,
                    categoria,
                    naturaleza,
                    sucursal,
                    estado_documento,
                    localidad,
                    cuenta_catastral,
                    finca_matricula,
                    bibliorato
                )
                SELECT
                    COALESCE((ap.mes_anho || '-01')::date, ap.fecha, ap.creado_en::date, CURRENT_DATE),
                    NULL,
                    ap.descripcion_ubicacion,
                    ap.observaciones,
                    ap.monto,
                    ap.a_favor_de,
                    ap.otorgado_por,
                    'Compra de terreno - ' || UPPER(CASE WHEN ap.local = 'otro' THEN COALESCE(NULLIF(ap.local_otro, ''), 'Otro') ELSE ap.local END),
                    'contrato',
                    'compra_terreno',
                    'Inmobiliaria / Legal',
                    UPPER(CASE WHEN ap.local = 'otro' THEN COALESCE(NULLIF(ap.local_otro, ''), 'Otro') ELSE ap.local END),
                    'vigente',
                    UPPER(CASE WHEN ap.local = 'otro' THEN COALESCE(NULLIF(ap.local_otro, ''), 'Otro') ELSE ap.local END),
                    ap.cuenta_catastral,
                    ap.numero_finca,
                    ap.bibliorato
                FROM archivos_propiedades ap
                WHERE ap.activo IS TRUE
                  AND NOT EXISTS (
                    SELECT 1
                    FROM contratos c
                    WHERE c.activo IS TRUE
                      AND c.categoria = 'compra_terreno'
                      AND COALESCE(c.ofrece_contrato, '') = COALESCE(ap.a_favor_de, '')
                      AND COALESCE(c.contratante, '') = COALESCE(ap.otorgado_por, '')
                      AND COALESCE(c.cuenta_catastral, '') = COALESCE(ap.cuenta_catastral, '')
                      AND COALESCE(c.finca_matricula, '') = COALESCE(ap.numero_finca, '')
                  )
                """
            )
            inserted = cur.rowcount
        conn.commit()
    print(f"Migracion 022_terrenos_archivos_a_contratos aplicada. Insertados: {inserted}")


if __name__ == "__main__":
    main()
