from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

import psycopg2
import psycopg2.extras

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from web.backend.config import DATABASE_URL
from web.backend.modules.acuerdos_comerciales.repository import AcuerdosComercialesRepository


LUQUE_AB = [
    ("A-1-P", "A", 1, "puntera", "COCA COLA", "2000000"),
    ("A-1-L1", "A", 1, "pestana", "PEPSICO PARAGUAY", "750000"),
    ("A-1-L2", "A", 1, "pestana", "DICROSA", "750000"),
    ("A-2-P", "A", 2, "puntera", "UNILEVER", "2000000"),
    ("A-2-L1", "A", 2, "pestana", "UNILEVER", "750000"),
    ("A-2-L2", "A", 2, "pestana", "UNILEVER", "750000"),
    ("A-3-P", "A", 3, "puntera", "UNILEVER", "2000000"),
    ("A-3-L1", "A", 3, "pestana", "DISTRIBUIDORA CENTRAL", "750000"),
    ("A-3-L2", "A", 3, "pestana", "INDEGA", "750000"),
    ("A-4-P", "A", 4, "puntera", "COCA COLA", "2000000"),
    ("A-4-L1", "A", 4, "pestana", "IRIS SAIC", "750000"),
    ("A-4-L2", "A", 4, "pestana", "POLIFOAM", "750000"),
    ("A-5-P", "A", 5, "puntera", "BEBIDAS DEL PARAGUAY", "2000000"),
    ("A-5-L1", "A", 5, "pestana", "ARPAR", "750000"),
    ("A-5-L2", "A", 5, "pestana", "AL SA", "750000"),
    ("A-6-P", "A", 6, "puntera", "EL CACIQUE", "2000000"),
    ("A-6-L1", "A", 6, "pestana", "SAN JOSE IMPORT EXPORT", "750000"),
    ("A-6-L2", "A", 6, "pestana", "LONDON IMPORT", "2000000"),
    ("A-7-P", "A", 7, "puntera", "DYLO", "2000000"),
    ("A-7-L1", "A", 7, "pestana", "PEPSICO PARAGUAY", "750000"),
    ("A-7-L2", "A", 7, "pestana", "PEPSICO PARAGUAY", "750000"),
    ("A-8-P", "A", 8, "puntera", "PROFARCO", "2000000"),
    ("A-8-L1", "A", 8, "pestana", "LACTALIS", "750000"),
    ("A-8-L2", "A", 8, "pestana", "TU CEREAL", "750000"),
    ("A-9-P", "A", 9, "puntera", "COCA COLA", "2000000"),
    ("A-9-L1", "A", 9, "pestana", "PALERMO", "750000"),
    ("A-9-L2", "A", 9, "pestana", "COCA COLA", "750000"),
    ("A-10-P", "A", 10, "puntera", "POLIFOAM", "2000000"),
    ("B-1-P", "B", 1, "puntera", "COMINCO", "2000000"),
    ("B-1-L1", "B", 1, "pestana", "COMINCO", "750000"),
    ("B-1-L2", "B", 1, "pestana", "COMINCO", "750000"),
    ("B-2-P", "B", 2, "puntera", "TROCIUK", "2000000"),
    ("B-2-L1", "B", 2, "pestana", "TROCIUK", "750000"),
    ("B-2-L2", "B", 2, "pestana", "TROCIUK", "750000"),
    ("B-3-P", "B", 3, "puntera", "EDUMAR", "2000000"),
    ("B-3-L1", "B", 3, "pestana", "ARPAR", "750000"),
    ("B-3-L2", "B", 3, "pestana", "DISTRIBUIDORA CENTRAL", "750000"),
    ("B-4-P", "B", 4, "puntera", "INDEGA", "2000000"),
    ("B-4-L1", "B", 4, "pestana", "INDEGA", "750000"),
    ("B-4-L2", "B", 4, "pestana", "INDEGA", "750000"),
    ("B-5-P", "B", 5, "puntera", "MAAHSA", "2000000"),
    ("B-5-L1", "B", 5, "pestana", "MAAHSA", "750000"),
    ("B-5-L2", "B", 5, "pestana", "MAAHSA", "750000"),
    ("B-6-P", "B", 6, "puntera", "DISTRIBUIDORA CENTRAL", "2000000"),
    ("B-6-L1", "B", 6, "pestana", "DISTRIBUIDORA CENTRAL", "750000"),
    ("B-6-L2", "B", 6, "pestana", "DISTRIBUIDORA CENTRAL", "750000"),
    ("B-7-P", "B", 7, "puntera", "AL SA", "2000000"),
    ("B-7-L1", "B", 7, "pestana", "CORPORACION TU CEREAL", "750000"),
    ("B-7-L2", "B", 7, "pestana", "FANE", "750000"),
    ("B-8-P", "B", 8, "puntera", "GRUPO DULCESAR", "2000000"),
    ("B-8-L1", "B", 8, "pestana", "WISHIMPEX", "750000"),
    ("B-8-L2", "B", 8, "pestana", "BIMBO", "750000"),
    ("B-9-P", "B", 9, "puntera", "PY TRADING", "2000000"),
    ("B-9-L1", "B", 9, "pestana", "PY TRADING", "750000"),
    ("B-9-L2", "B", 9, "pestana", "PY TRADING", "750000"),
    ("B-10-P", "B", 10, "puntera", "BELLEZA Y AROMA", "2000000"),
]


def _upsert_proveedor(cur, nombre: str) -> int:
    cur.execute(
        """
        SELECT id
        FROM acuerdos_proveedores
        WHERE LOWER(BTRIM(nombre)) = LOWER(BTRIM(%s))
        ORDER BY CASE WHEN COALESCE(BTRIM(ruc), '') <> '' THEN 0 ELSE 1 END, id
        LIMIT 1
        """,
        (nombre,),
    )
    row = cur.fetchone()
    if row:
        return int(row["id"])
    cur.execute(
        """
        INSERT INTO acuerdos_proveedores(nombre, ruc, telefono, email)
        VALUES (%s, '', '', '')
        ON CONFLICT (LOWER(BTRIM(nombre)), LOWER(BTRIM(COALESCE(ruc, ''))))
        DO UPDATE SET actualizado_en = NOW()
        RETURNING id
        """,
        (nombre,),
    )
    return int(cur.fetchone()["id"])


def _cleanup_empty_luque_import_agreements(cur) -> None:
    cur.execute(
        """
        DELETE FROM acuerdos_comerciales a
        WHERE a.observaciones = 'Creado por importacion de ubicaciones Luque A/B.'
          AND NOT EXISTS (
              SELECT 1
              FROM acuerdos_ubicaciones u
              WHERE u.acuerdo_id = a.id
          )
        """
    )
    cur.execute(
        """
        DELETE FROM acuerdos_proveedores p
        WHERE COALESCE(BTRIM(p.ruc), '') = ''
          AND NOT EXISTS (
              SELECT 1
              FROM acuerdos_comerciales a
              WHERE a.proveedor_id = p.id
          )
        """
    )


def _ensure_acuerdo(cur, proveedor_id: int, proveedor_nombre: str) -> int:
    cur.execute(
        """
        SELECT id
        FROM acuerdos_comerciales
        WHERE proveedor_id = %s
          AND activo IS TRUE
        ORDER BY COALESCE(vigencia_desde, creado_en::date) DESC, id DESC
        LIMIT 1
        """,
        (proveedor_id,),
    )
    row = cur.fetchone()
    if row:
        return int(row["id"])
    cur.execute(
        """
        INSERT INTO acuerdos_comerciales(
            proveedor_id, titulo, retorno_porcentaje, estado_renovacion, observaciones, activo
        )
        VALUES (%s, %s, 0, 'vigente', 'Creado por importacion de ubicaciones Luque A/B.', TRUE)
        RETURNING id
        """,
        (proveedor_id, f"Acuerdo comercial {proveedor_nombre}"),
    )
    return int(cur.fetchone()["id"])


def main() -> None:
    AcuerdosComercialesRepository(DATABASE_URL)._ensure_schema()
    creadas = 0
    actualizadas = 0
    with psycopg2.connect(DATABASE_URL, connect_timeout=5) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for index, (codigo, bloque, numero, tipo, proveedor, valor) in enumerate(LUQUE_AB, start=1):
                valor_gs = Decimal(valor)
                detalle = f"Bloque {bloque} - N {numero}"
                cur.execute(
                    """
                    INSERT INTO acuerdos_mapa_ubicaciones(sucursal, codigo, bloque, numero, tipo_espacio, valor_gs, detalle)
                    VALUES ('luque', %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sucursal, codigo)
                    DO UPDATE SET bloque = EXCLUDED.bloque,
                                  numero = EXCLUDED.numero,
                                  tipo_espacio = EXCLUDED.tipo_espacio,
                                  valor_gs = EXCLUDED.valor_gs,
                                  detalle = EXCLUDED.detalle,
                                  activo = TRUE,
                                  actualizado_en = NOW()
                    """,
                    (codigo, bloque, numero, tipo, valor_gs, detalle),
                )
                proveedor_id = _upsert_proveedor(cur, proveedor)
                acuerdo_id = _ensure_acuerdo(cur, proveedor_id, proveedor)
                cur.execute(
                    """
                    SELECT id, acuerdo_id
                    FROM acuerdos_ubicaciones
                    WHERE sucursal = 'luque'
                      AND LOWER(BTRIM(COALESCE(codigo, ''))) = LOWER(BTRIM(%s))
                    LIMIT 1
                    """,
                    (codigo,),
                )
                existing = cur.fetchone()
                if existing:
                    cur.execute(
                        """
                        UPDATE acuerdos_ubicaciones
                        SET acuerdo_id = %s,
                            tipo_espacio = %s,
                            ubicacion = %s,
                            codigo = %s,
                            bloque = %s,
                            numero = %s,
                            valor_gs = %s,
                            detalle = %s,
                            orden = %s,
                            tentativa = FALSE
                        WHERE id = %s
                        """,
                        (acuerdo_id, tipo, codigo, codigo, bloque, numero, valor_gs, detalle, index, int(existing["id"])),
                    )
                    actualizadas += 1
                else:
                    cur.execute(
                        """
                        INSERT INTO acuerdos_ubicaciones(
                            acuerdo_id, sucursal, tipo_espacio, ubicacion, codigo,
                            bloque, numero, valor_gs, detalle, orden
                        )
                        VALUES (%s, 'luque', %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (acuerdo_id, tipo, codigo, codigo, bloque, numero, valor_gs, detalle, index),
                    )
                    creadas += 1
            _cleanup_empty_luque_import_agreements(cur)
        conn.commit()
    print({"ok": True, "leidas": len(LUQUE_AB), "creadas": creadas, "actualizadas": actualizadas})


if __name__ == "__main__":
    main()
