from __future__ import annotations

import csv
import json
import re
import threading
from datetime import date, datetime
from decimal import Decimal
from io import StringIO
from typing import Any

import psycopg2
import psycopg2.extras


SUCURSALES = {
    "aregua": {"local": "AREGUA", "nombre": "Aregua"},
    "luque": {"local": "LUQUE", "nombre": "Luque"},
    "itaugua": {"local": "ITAUGUA", "nombre": "Itaugua"},
}

PERFUMERIA_MAPA_UBICACIONES = (
    ("PA", "A-P1", 1, "puntera"),
    ("PA", "A-P1-L1", 1, "pestana"),
    ("PA", "A-P1-L2", 1, "pestana"),
    ("PA", "A-P2", 2, "puntera"),
    ("PA", "A-P2-L1", 2, "pestana"),
    ("PA", "A-P2-L2", 2, "pestana"),
    ("PA", "A-P3", 3, "puntera"),
    ("PA", "A-P3-L1", 3, "pestana"),
    ("PA", "A-P3-L2", 3, "pestana"),
    ("PA", "A-P4", 4, "puntera"),
    ("PA", "A-P4-L1", 4, "pestana"),
    ("PA", "A-P4-L2", 4, "pestana"),
    ("PB", "B-P4", 4, "puntera"),
    ("PB", "B-P4-L1", 4, "pestana"),
    ("PB", "B-P4-L2", 4, "pestana"),
    ("PB", "B-P3", 3, "puntera"),
    ("PB", "B-P3-L1", 3, "pestana"),
    ("PB", "B-P3-L2", 3, "pestana"),
    ("PB", "B-P2", 2, "puntera"),
    ("PB", "B-P2-L1", 2, "pestana"),
    ("PB", "B-P2-L2", 2, "pestana"),
    ("PB", "B-P1", 1, "puntera"),
    ("PB", "B-P1-L1", 1, "pestana"),
    ("PB", "B-P1-L2", 1, "pestana"),
)

LINEA_CAJA_MAPA_UBICACIONES = tuple(
    ("LC", codigo, index, "puntera")
    for index, codigo in enumerate(
        (
            "LC-1/2",
            "LC-3/4",
            "LC-5/6",
            "LC-7",
            "LC-8",
            "LC-9",
            "LC-10",
            "LC-11",
            "LC-12",
            "LC-13/14",
            "LC-15/16",
            "LC-17/18",
            "LC-19/20",
            "LC-21/22",
            "LC-23/24",
            "LC-25/26",
            "LC-27/28",
            "LC-29/30",
            "LC-31/32",
            "LC-33/34",
            "LC-35/36",
            "LC-37/38",
            "LC-39/40",
            "LC-41/42",
        ),
        start=1,
    )
)

PANADERIA_MAPA_UBICACIONES = (
    ("PAN", "PA-A-P1", 1, "puntera"),
    ("PAN", "PA-A-P2", 2, "puntera"),
    ("PAN", "PA-B-P2", 3, "puntera"),
)


def _json_default(value: Any):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return str(value)


def _parse_flexible_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    raw = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%d-%m-%y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _parse_number(value):
    s = str(value if value is not None else "").strip()
    if s == "":
        return 0.0
    if "," in s and "." in s:
        if s.find(",") < s.find("."):
            s = s.replace(",", "")
        else:
            s = s.replace(".", "").replace(",", ".")
    else:
        if "," in s:
            if s.count(",") >= 1:
                parts = s.split(",")
                if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3 and parts[0].replace("-", "").isdigit() and parts[1].isdigit()):
                    s = s.replace(",", "")
                else:
                    s = s.replace(",", ".")
        elif "." in s:
            parts = s.split(".")
            if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3 and parts[0].replace("-", "").isdigit() and parts[1].isdigit()):
                s = s.replace(".", "")
    return float(s)


def _parse_int(value):
    s = str(value if value is not None else "").strip()
    if s == "":
        return 0
    s = s.replace(",", "")
    if "." in s:
        raise ValueError("Unidades debe ser un entero.")
    return int(s)


def _parse_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "t", "si", "sí", "y", "yes"}:
        return True
    if text in {"0", "false", "f", "no", "n"}:
        return False
    return default


def _normalize_proveedor_key(value):
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


class AcuerdosComercialesRepository:
    _schema_ready_global = False
    _schema_lock = threading.Lock()

    def __init__(self, db_url: str):
        self.db_url = db_url

    def _connect(self, readonly=True):
        conn = psycopg2.connect(self.db_url, connect_timeout=5)
        conn.set_session(readonly=readonly, autocommit=readonly)
        return conn

    def _ensure_schema(self):
        if AcuerdosComercialesRepository._schema_ready_global:
            return
        with AcuerdosComercialesRepository._schema_lock:
            if AcuerdosComercialesRepository._schema_ready_global:
                return
            with psycopg2.connect(self.db_url, connect_timeout=5) as conn:
                cur = conn.cursor()
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
                    CREATE TABLE IF NOT EXISTS acuerdos_comerciales (
                        id SERIAL PRIMARY KEY,
                        proveedor_id INTEGER NOT NULL REFERENCES acuerdos_proveedores(id),
                        titulo TEXT NOT NULL,
                        retorno_porcentaje NUMERIC(8, 3) NOT NULL DEFAULT 0,
                        duracion_meses INTEGER NULL,
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
                    ALTER TABLE acuerdos_comerciales
                    ADD COLUMN IF NOT EXISTS duracion_meses INTEGER NULL
                    """
                )
                cur.execute(
                    """
                    ALTER TABLE acuerdos_comerciales
                    ADD COLUMN IF NOT EXISTS estado_renovacion TEXT NOT NULL DEFAULT 'vigente'
                    """
                )
                cur.execute(
                    """
                    ALTER TABLE acuerdos_comerciales
                    ADD COLUMN IF NOT EXISTS acuerdo_origen_id INTEGER NULL REFERENCES acuerdos_comerciales(id)
                    """
                )
                cur.execute(
                    """
                    ALTER TABLE acuerdos_comerciales
                    ADD COLUMN IF NOT EXISTS renovado_por_acuerdo_id INTEGER NULL REFERENCES acuerdos_comerciales(id)
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
                        codigo TEXT NULL,
                        bloque TEXT NULL,
                        numero INTEGER NULL,
                        valor_gs NUMERIC(14, 2) NULL,
                        detalle TEXT NULL,
                        orden INTEGER NOT NULL DEFAULT 1
                    )
                    """
                )
                cur.execute("ALTER TABLE acuerdos_ubicaciones ADD COLUMN IF NOT EXISTS codigo TEXT NULL")
                cur.execute("ALTER TABLE acuerdos_ubicaciones ADD COLUMN IF NOT EXISTS bloque TEXT NULL")
                cur.execute("ALTER TABLE acuerdos_ubicaciones ADD COLUMN IF NOT EXISTS numero INTEGER NULL")
                cur.execute("ALTER TABLE acuerdos_ubicaciones ADD COLUMN IF NOT EXISTS valor_gs NUMERIC(14, 2) NULL")
                cur.execute("ALTER TABLE acuerdos_ubicaciones ADD COLUMN IF NOT EXISTS tentativa BOOLEAN NOT NULL DEFAULT FALSE")
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS acuerdos_mapa_ubicaciones (
                        id SERIAL PRIMARY KEY,
                        sucursal TEXT NOT NULL,
                        codigo TEXT NOT NULL,
                        bloque TEXT NOT NULL,
                        numero INTEGER NOT NULL,
                        tipo_espacio TEXT NOT NULL,
                        valor_gs NUMERIC(14, 2) NULL,
                        detalle TEXT NULL,
                        activo BOOLEAN NOT NULL DEFAULT TRUE,
                        creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                        actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                        CONSTRAINT uq_acuerdos_mapa_ubicaciones_codigo UNIQUE (sucursal, codigo)
                    )
                    """
                )
                cur.execute("ALTER TABLE acuerdos_mapa_ubicaciones ADD COLUMN IF NOT EXISTS detalle TEXT NULL")
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
                    CREATE TABLE IF NOT EXISTS acuerdos_facturas (
                        id SERIAL PRIMARY KEY,
                        acuerdo_id INTEGER NOT NULL REFERENCES acuerdos_comerciales(id) ON DELETE CASCADE,
                        periodo_anho INTEGER NOT NULL,
                        periodo_mes INTEGER NOT NULL,
                        numero_factura TEXT NOT NULL,
                        monto_factura NUMERIC(14, 2) NOT NULL DEFAULT 0,
                        fecha_factura DATE NULL,
                        tipo_facturacion TEXT NOT NULL DEFAULT 'ambos',
                        cobrado BOOLEAN NOT NULL DEFAULT FALSE,
                        fecha_cobro DATE NULL,
                        forma_cobro TEXT NULL,
                        observaciones TEXT NULL,
                        creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                        actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                        CONSTRAINT chk_acuerdos_facturas_periodo_mes CHECK (periodo_mes BETWEEN 1 AND 12)
                    )
                    """
                )
                cur.execute("ALTER TABLE acuerdos_facturas ADD COLUMN IF NOT EXISTS forma_cobro TEXT NULL")
                cur.execute("ALTER TABLE acuerdos_facturas ADD COLUMN IF NOT EXISTS tipo_facturacion TEXT NOT NULL DEFAULT 'ambos'")
                cur.execute(
                    """
                    ALTER TABLE acuerdos_facturas
                    DROP CONSTRAINT IF EXISTS uq_acuerdos_facturas_periodo
                    """
                )
                cur.execute(
                    """
                    ALTER TABLE acuerdos_facturas
                    DROP CONSTRAINT IF EXISTS chk_acuerdos_facturas_tipo
                    """
                )
                cur.execute(
                    """
                    ALTER TABLE acuerdos_facturas
                    ADD CONSTRAINT chk_acuerdos_facturas_tipo
                    CHECK (tipo_facturacion IN ('alquiler', 'porcentaje_venta', 'ambos'))
                    """
                )
                cur.execute(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_acuerdos_facturas_periodo_tipo
                    ON acuerdos_facturas(acuerdo_id, periodo_anho, periodo_mes, tipo_facturacion)
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_acuerdos_historial_acuerdo
                    ON acuerdos_historial(acuerdo_id, creado_en DESC)
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
                cur.execute("DROP INDEX IF EXISTS uq_acuerdos_ubicaciones_sucursal_codigo")
                cur.execute(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_acuerdos_ubicaciones_sucursal_codigo_confirmadas
                    ON acuerdos_ubicaciones (
                        sucursal,
                        LOWER(BTRIM(COALESCE(codigo, '')))
                    )
                    WHERE COALESCE(BTRIM(codigo), '') <> ''
                      AND tentativa IS FALSE
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
                    INSERT INTO acuerdos_mapa_ubicaciones(sucursal, codigo, bloque, numero, tipo_espacio, valor_gs)
                    SELECT DISTINCT ON (u.sucursal, u.codigo)
                           u.sucursal,
                           u.codigo,
                           COALESCE(NULLIF(u.bloque, ''), UPPER(SUBSTRING(u.codigo FROM '^([A-D])'))),
                           COALESCE(u.numero, CAST(SUBSTRING(u.codigo FROM '^[A-D]-(\\d+)') AS INTEGER)),
                           u.tipo_espacio,
                           u.valor_gs
                    FROM acuerdos_ubicaciones u
                    WHERE COALESCE(BTRIM(u.codigo), '') <> ''
                      AND UPPER(COALESCE(NULLIF(u.bloque, ''), SUBSTRING(u.codigo FROM '^([A-D])'))) IN ('A', 'B', 'C', 'D')
                      AND COALESCE(u.numero, CAST(SUBSTRING(u.codigo FROM '^[A-D]-(\\d+)') AS INTEGER)) IS NOT NULL
                    ON CONFLICT (sucursal, codigo)
                    DO UPDATE SET tipo_espacio = EXCLUDED.tipo_espacio,
                                  valor_gs = COALESCE(EXCLUDED.valor_gs, acuerdos_mapa_ubicaciones.valor_gs),
                                  activo = TRUE,
                                  actualizado_en = NOW()
                    """
                )
                for sucursal_key in SUCURSALES:
                    cur.executemany(
                        """
                        INSERT INTO acuerdos_mapa_ubicaciones(sucursal, codigo, bloque, numero, tipo_espacio, valor_gs)
                        VALUES (%s, %s, %s, %s, %s, NULL)
                        ON CONFLICT (sucursal, codigo)
                        DO UPDATE SET bloque = EXCLUDED.bloque,
                                      numero = EXCLUDED.numero,
                                      tipo_espacio = EXCLUDED.tipo_espacio,
                                      activo = TRUE,
                                      actualizado_en = NOW()
                        """,
                        [
                            (sucursal_key, codigo, bloque, numero, tipo_espacio)
                            for bloque, codigo, numero, tipo_espacio in (
                                PERFUMERIA_MAPA_UBICACIONES + LINEA_CAJA_MAPA_UBICACIONES + PANADERIA_MAPA_UBICACIONES
                            )
                        ],
                    )
                conn.commit()
                AcuerdosComercialesRepository._schema_ready_global = True

    def list_acuerdos_cobranzas(self, mes, anho):
        periodo_mes = _parse_int(mes)
        periodo_anho = _parse_int(anho)
        if periodo_mes < 1 or periodo_mes > 12:
            raise ValueError("El mes debe estar entre 1 y 12.")
        if periodo_anho < 2000 or periodo_anho > 2100:
            raise ValueError("El anho del periodo no es valido.")
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT a.id AS acuerdo_id,
                           a.proveedor_id,
                           p.nombre AS proveedor_nombre,
                           p.ruc AS proveedor_ruc,
                           a.titulo,
                           a.retorno_porcentaje,
                           a.vigencia_desde,
                           a.vigencia_hasta,
                           a.estado_renovacion,
                           a.activo
                    FROM acuerdos_comerciales a
                    JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                    WHERE a.activo = TRUE
                      AND (
                          a.vigencia_desde IS NULL
                          OR a.vigencia_desde <= (MAKE_DATE(%s, %s, 1) + INTERVAL '1 month - 1 day')::date
                      )
                      AND (
                          a.vigencia_hasta IS NULL
                          OR a.vigencia_hasta >= MAKE_DATE(%s, %s, 1)
                      )
                    ORDER BY p.nombre ASC, a.titulo ASC, a.id ASC
                    """,
                    (periodo_anho, periodo_mes, periodo_anho, periodo_mes),
                )
                acuerdos = [dict(row) for row in cur.fetchall()]
                acuerdo_ids = [int(row["acuerdo_id"]) for row in acuerdos]
                facturas_by_acuerdo: dict[int, dict[str, dict[str, Any]]] = {}
                if acuerdo_ids:
                    cur.execute(
                        """
                        SELECT acuerdo_id,
                           f.id,
                           f.periodo_anho,
                           f.periodo_mes,
                           f.tipo_facturacion,
                           f.numero_factura,
                           f.monto_factura,
                           f.fecha_factura,
                           f.cobrado,
                           f.fecha_cobro,
                           f.forma_cobro,
                           f.observaciones,
                           f.actualizado_en
                        FROM acuerdos_facturas f
                        WHERE f.acuerdo_id = ANY(%s)
                          AND f.periodo_anho = %s
                          AND f.periodo_mes = %s
                        """,
                        (acuerdo_ids, periodo_anho, periodo_mes),
                    )
                    for row in cur.fetchall():
                        facturas_by_acuerdo.setdefault(int(row["acuerdo_id"]), {})[row["tipo_facturacion"] or "ambos"] = dict(row)
                items = []
                total_facturado = Decimal("0")
                total_cobrado = Decimal("0")
                pendientes = 0
                cobradas = 0
                for acuerdo in acuerdos:
                    facturas = facturas_by_acuerdo.get(int(acuerdo["acuerdo_id"]), {})
                    rows = [facturas["ambos"]] if facturas.get("ambos") else [
                        facturas.get("alquiler") or {"tipo_facturacion": "alquiler"},
                        facturas.get("porcentaje_venta") or {"tipo_facturacion": "porcentaje_venta"},
                    ]
                    for factura in rows:
                        item = {**acuerdo, **factura}
                        tipo = item.get("tipo_facturacion") or "alquiler"
                        cobertura = 2 if tipo == "ambos" else 1
                        item["tipo_facturacion"] = tipo
                        item["cobertura_tipos"] = cobertura
                        item["periodo_anho"] = item.get("periodo_anho") or periodo_anho
                        item["periodo_mes"] = item.get("periodo_mes") or periodo_mes
                        item["numero_factura"] = item.get("numero_factura") or ""
                        item["forma_cobro"] = item.get("forma_cobro") or ""
                        item["monto_factura"] = item.get("monto_factura") or Decimal("0")
                        item["cobrado"] = bool(item.get("cobrado") or False)
                        amount = item["monto_factura"] if isinstance(item["monto_factura"], Decimal) else Decimal(str(item["monto_factura"] or 0))
                        total_facturado += amount
                        if item["cobrado"]:
                            cobradas += cobertura
                            total_cobrado += amount
                        else:
                            pendientes += cobertura
                        items.append(item)
                return {
                    "periodo": {"mes": periodo_mes, "anho": periodo_anho},
                    "totales": {
                        "facturas": len(acuerdos) * 2,
                        "cobradas": cobradas,
                        "pendientes": pendientes,
                        "total_facturado": total_facturado,
                        "total_cobrado": total_cobrado,
                        "total_pendiente": total_facturado - total_cobrado,
                    },
                    "items": items,
                }

    def list_acuerdos_cobranzas_anual(self, anho):
        periodo_anho = _parse_int(anho)
        if periodo_anho < 2000 or periodo_anho > 2100:
            raise ValueError("El anho del periodo no es valido.")
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    WITH meses AS (
                        SELECT generate_series(1, 12)::int AS mes
                    ),
                    esperados AS (
                        SELECT m.mes,
                               a.id AS acuerdo_id,
                               p.id AS proveedor_id,
                               p.nombre AS proveedor_nombre,
                               a.titulo
                        FROM meses m
                        JOIN acuerdos_comerciales a
                          ON a.activo = TRUE
                         AND (
                            a.vigencia_desde IS NULL
                            OR a.vigencia_desde <= (MAKE_DATE(%s, m.mes, 1) + INTERVAL '1 month - 1 day')::date
                         )
                         AND (
                            a.vigencia_hasta IS NULL
                            OR a.vigencia_hasta >= MAKE_DATE(%s, m.mes, 1)
                         )
                        JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                    ),
                    facturas AS (
                        SELECT acuerdo_id,
                               periodo_mes,
                               COALESCE(SUM(monto_factura), 0) AS monto_factura,
                               COALESCE(SUM(CASE WHEN cobrado THEN monto_factura ELSE 0 END), 0) AS monto_cobrado,
                               GREATEST(
                                   COALESCE(MAX(CASE WHEN tipo_facturacion = 'ambos' AND cobrado THEN 2 ELSE 0 END), 0),
                                   COALESCE(SUM(CASE WHEN tipo_facturacion IN ('alquiler', 'porcentaje_venta') AND cobrado THEN 1 ELSE 0 END), 0)
                               )::int AS cobradas_tipos
                        FROM acuerdos_facturas
                        WHERE periodo_anho = %s
                        GROUP BY acuerdo_id, periodo_mes
                    ),
                    base AS (
                        SELECT e.mes,
                               e.acuerdo_id,
                               e.proveedor_id,
                               e.proveedor_nombre,
                               e.titulo,
                               COALESCE(f.monto_factura, 0) AS monto_factura,
                               COALESCE(f.monto_cobrado, 0) AS monto_cobrado,
                               COALESCE(f.cobradas_tipos, 0) AS cobradas_tipos
                        FROM esperados e
                        LEFT JOIN facturas f
                          ON f.acuerdo_id = e.acuerdo_id
                         AND f.periodo_mes = e.mes
                    )
                    SELECT mes,
                           (COUNT(*) * 2)::int AS facturas,
                           COALESCE(SUM(cobradas_tipos), 0)::int AS cobradas,
                           GREATEST((COUNT(*) * 2) - COALESCE(SUM(cobradas_tipos), 0), 0)::int AS pendientes,
                           COALESCE(SUM(monto_factura), 0) AS total_facturado,
                           COALESCE(SUM(monto_cobrado), 0) AS total_cobrado
                    FROM base
                    GROUP BY mes
                    ORDER BY mes
                    """,
                    (periodo_anho, periodo_anho, periodo_anho),
                )
                meses = []
                month_map = {int(row["mes"]): dict(row) for row in cur.fetchall()}
                for mes in range(1, 13):
                    row = month_map.get(mes) or {
                        "mes": mes,
                        "facturas": 0,
                        "cobradas": 0,
                        "pendientes": 0,
                        "total_facturado": Decimal("0"),
                        "total_cobrado": Decimal("0"),
                    }
                    facturas = int(row.get("facturas") or 0)
                    cobradas = int(row.get("cobradas") or 0)
                    total_facturado = Decimal(str(row.get("total_facturado") or 0))
                    total_cobrado = Decimal(str(row.get("total_cobrado") or 0))
                    row["porcentaje_facturas"] = round((cobradas / facturas) * 100, 2) if facturas else 0
                    row["porcentaje_monto"] = round((total_cobrado / total_facturado) * 100, 2) if total_facturado else 0
                    meses.append(row)

                cur.execute(
                    """
                    WITH meses AS (
                        SELECT generate_series(1, 12)::int AS mes
                    ),
                    esperados AS (
                        SELECT m.mes,
                               a.id AS acuerdo_id,
                               p.id AS proveedor_id,
                               p.nombre AS proveedor_nombre,
                               a.titulo
                        FROM meses m
                        JOIN acuerdos_comerciales a
                          ON a.activo = TRUE
                         AND (
                            a.vigencia_desde IS NULL
                            OR a.vigencia_desde <= (MAKE_DATE(%s, m.mes, 1) + INTERVAL '1 month - 1 day')::date
                         )
                         AND (
                            a.vigencia_hasta IS NULL
                            OR a.vigencia_hasta >= MAKE_DATE(%s, m.mes, 1)
                         )
                        JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                    ),
                    facturas AS (
                        SELECT acuerdo_id,
                               periodo_mes,
                               COALESCE(SUM(monto_factura), 0) AS monto_factura,
                               COALESCE(SUM(CASE WHEN cobrado THEN monto_factura ELSE 0 END), 0) AS monto_cobrado,
                               GREATEST(
                                   COALESCE(MAX(CASE WHEN tipo_facturacion = 'ambos' AND cobrado THEN 2 ELSE 0 END), 0),
                                   COALESCE(SUM(CASE WHEN tipo_facturacion IN ('alquiler', 'porcentaje_venta') AND cobrado THEN 1 ELSE 0 END), 0)
                               )::int AS cobradas_tipos
                        FROM acuerdos_facturas
                        WHERE periodo_anho = %s
                        GROUP BY acuerdo_id, periodo_mes
                    )
                    SELECT e.proveedor_id,
                           e.proveedor_nombre,
                           e.mes,
                           (COUNT(*) * 2)::int AS facturas,
                           COALESCE(SUM(COALESCE(f.cobradas_tipos, 0)), 0)::int AS cobradas,
                           COALESCE(SUM(COALESCE(f.monto_factura, 0)), 0) AS total_facturado,
                           COALESCE(SUM(COALESCE(f.monto_cobrado, 0)), 0) AS total_cobrado
                    FROM esperados e
                    LEFT JOIN facturas f
                      ON f.acuerdo_id = e.acuerdo_id
                     AND f.periodo_mes = e.mes
                    GROUP BY e.proveedor_id, e.proveedor_nombre, e.mes
                    ORDER BY e.proveedor_nombre, e.mes
                    """,
                    (periodo_anho, periodo_anho, periodo_anho),
                )
                proveedores: dict[int, dict[str, Any]] = {}
                for row in cur.fetchall():
                    item = proveedores.setdefault(
                        int(row["proveedor_id"]),
                        {
                            "proveedor_id": int(row["proveedor_id"]),
                            "proveedor_nombre": row["proveedor_nombre"],
                            "meses": [],
                        },
                    )
                    facturas = int(row.get("facturas") or 0)
                    cobradas = int(row.get("cobradas") or 0)
                    item["meses"].append(
                        {
                            "mes": int(row["mes"]),
                            "facturas": facturas,
                            "cobradas": cobradas,
                            "porcentaje": round((cobradas / facturas) * 100, 2) if facturas else 0,
                            "total_facturado": row.get("total_facturado") or Decimal("0"),
                            "total_cobrado": row.get("total_cobrado") or Decimal("0"),
                        }
                    )
                return {"anho": periodo_anho, "meses": meses, "proveedores": list(proveedores.values())}

    def get_estadisticas(self, mes=None, anho=None):
        today = date.today()
        periodo_mes = _parse_int(mes or today.month)
        periodo_anho = _parse_int(anho or today.year)
        if periodo_mes < 1 or periodo_mes > 12:
            raise ValueError("El mes debe estar entre 1 y 12.")
        if periodo_anho < 2000 or periodo_anho > 2100:
            raise ValueError("El anho del periodo no es valido.")
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    WITH acuerdos_base AS (
                        SELECT a.id,
                               a.proveedor_id,
                               p.nombre AS proveedor_nombre,
                               a.estado_renovacion,
                               a.vigencia_hasta,
                               a.activo,
                               COALESCE(SUM(CASE WHEN u.tentativa IS FALSE THEN u.valor_gs ELSE 0 END), 0) AS valor_mensual,
                               COUNT(CASE WHEN u.tentativa IS FALSE THEN u.id END)::int AS ubicaciones
                        FROM acuerdos_comerciales a
                        JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                        LEFT JOIN acuerdos_ubicaciones u ON u.acuerdo_id = a.id
                        GROUP BY a.id, p.id
                    ),
                    facturas_mes AS (
                        SELECT acuerdo_id,
                               COALESCE(SUM(monto_factura), 0) AS facturado,
                               COALESCE(SUM(CASE WHEN cobrado THEN monto_factura ELSE 0 END), 0) AS cobrado,
                               COUNT(*)::int AS facturas_cargadas,
                               COUNT(CASE WHEN cobrado THEN 1 END)::int AS facturas_cobradas
                        FROM acuerdos_facturas
                        WHERE periodo_anho = %s
                          AND periodo_mes = %s
                        GROUP BY acuerdo_id
                    )
                    SELECT COUNT(CASE WHEN a.activo THEN 1 END)::int AS acuerdos_activos,
                           COUNT(CASE WHEN a.estado_renovacion = 'en_negociacion' THEN 1 END)::int AS negociaciones,
                           COUNT(CASE WHEN a.activo AND a.vigencia_hasta BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END)::int AS vencen_30,
                           COUNT(CASE WHEN a.activo AND a.vigencia_hasta BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN 1 END)::int AS vencen_60,
                           COUNT(CASE WHEN a.activo AND a.vigencia_hasta BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN 1 END)::int AS vencen_90,
                           COUNT(CASE WHEN a.activo AND a.vigencia_hasta < CURRENT_DATE THEN 1 END)::int AS vencidos,
                           COALESCE(SUM(CASE WHEN a.activo THEN a.valor_mensual ELSE 0 END), 0) AS ingreso_mensual_contratado,
                           COALESCE(SUM(CASE WHEN a.activo AND a.vigencia_hasta BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN a.valor_mensual ELSE 0 END), 0) AS valor_riesgo_90,
                           COALESCE(SUM(f.facturado), 0) AS total_facturado,
                           COALESCE(SUM(f.cobrado), 0) AS total_cobrado,
                           COALESCE(SUM(f.facturado - f.cobrado), 0) AS total_pendiente,
                           COALESCE(SUM(f.facturas_cargadas), 0)::int AS facturas_cargadas,
                           COALESCE(SUM(f.facturas_cobradas), 0)::int AS facturas_cobradas,
                           COUNT(CASE WHEN a.activo AND COALESCE(f.facturas_cargadas, 0) = 0 THEN 1 END)::int AS acuerdos_sin_facturacion
                    FROM acuerdos_base a
                    LEFT JOIN facturas_mes f ON f.acuerdo_id = a.id
                    """,
                    (periodo_anho, periodo_mes),
                )
                resumen = dict(cur.fetchone() or {})

                cur.execute(
                    """
                    WITH activos AS (
                        SELECT a.id, a.proveedor_id, p.nombre AS proveedor_nombre, u.valor_gs
                        FROM acuerdos_comerciales a
                        JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                        JOIN acuerdos_ubicaciones u ON u.acuerdo_id = a.id
                        WHERE a.activo IS TRUE
                          AND u.tentativa IS FALSE
                    )
                    SELECT proveedor_id,
                           proveedor_nombre,
                           COALESCE(SUM(valor_gs), 0) AS valor_mensual,
                           COUNT(*)::int AS ubicaciones
                    FROM activos
                    GROUP BY proveedor_id, proveedor_nombre
                    ORDER BY valor_mensual DESC, ubicaciones DESC, proveedor_nombre ASC
                    LIMIT 10
                    """
                )
                top_proveedores = [dict(row) for row in cur.fetchall()]

                cur.execute(
                    """
                    SELECT u.sucursal,
                           u.tipo_espacio,
                           COALESCE(SUM(u.valor_gs), 0) AS valor_mensual,
                           COUNT(*)::int AS ubicaciones
                    FROM acuerdos_ubicaciones u
                    JOIN acuerdos_comerciales a ON a.id = u.acuerdo_id AND a.activo IS TRUE
                    WHERE u.tentativa IS FALSE
                    GROUP BY u.sucursal, u.tipo_espacio
                    ORDER BY u.sucursal, valor_mensual DESC
                    """
                )
                mix_espacios = [dict(row) for row in cur.fetchall()]

                cur.execute(
                    """
                    WITH ocupacion AS (
                        SELECT m.sucursal,
                               m.tipo_espacio,
                               CASE
                                   WHEN UPPER(COALESCE(m.bloque, '')) IN ('A', 'B', 'C', 'D') THEN 'ABCD'
                                   WHEN UPPER(COALESCE(m.bloque, '')) IN ('PA', 'PB') THEN 'PERFUMERIA'
                                   ELSE m.bloque
                               END AS bloque,
                               COUNT(*)::int AS total,
                               COUNT(c.acuerdo_id)::int AS ocupadas,
                               COALESCE(SUM(CASE WHEN c.acuerdo_id IS NULL THEN m.valor_gs ELSE 0 END), 0) AS potencial_libre
                        FROM acuerdos_mapa_ubicaciones m
                        LEFT JOIN (
                            SELECT DISTINCT ON (u.sucursal, u.codigo)
                                   u.sucursal,
                                   u.codigo,
                                   u.acuerdo_id,
                                   u.valor_gs
                            FROM acuerdos_ubicaciones u
                            JOIN acuerdos_comerciales a ON a.id = u.acuerdo_id AND a.activo IS TRUE
                            WHERE u.tentativa IS FALSE
                            ORDER BY u.sucursal, u.codigo, u.id DESC
                        ) c ON c.sucursal = m.sucursal AND c.codigo = m.codigo
                        WHERE m.activo IS TRUE
                          AND (
                              c.acuerdo_id IS NOT NULL
                              OR COALESCE(m.valor_gs, 0) > 0
                          )
                        GROUP BY m.sucursal,
                                 m.tipo_espacio,
                                 CASE
                                     WHEN UPPER(COALESCE(m.bloque, '')) IN ('A', 'B', 'C', 'D') THEN 'ABCD'
                                     WHEN UPPER(COALESCE(m.bloque, '')) IN ('PA', 'PB') THEN 'PERFUMERIA'
                                     ELSE m.bloque
                                 END
                    )
                    SELECT sucursal,
                           tipo_espacio,
                           bloque,
                           total,
                           ocupadas,
                           GREATEST(total - ocupadas, 0)::int AS libres,
                           potencial_libre
                    FROM ocupacion
                    ORDER BY sucursal, tipo_espacio, bloque
                    """
                )
                ocupacion = [dict(row) for row in cur.fetchall()]

                cur.execute(
                    """
                    SELECT a.id,
                           a.titulo,
                           p.nombre AS proveedor_nombre,
                           a.vigencia_hasta,
                           COALESCE(SUM(u.valor_gs), 0) AS valor_mensual,
                           (a.vigencia_hasta - CURRENT_DATE)::int AS dias
                    FROM acuerdos_comerciales a
                    JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                    LEFT JOIN acuerdos_ubicaciones u ON u.acuerdo_id = a.id AND u.tentativa IS FALSE
                    WHERE a.activo IS TRUE
                      AND a.vigencia_hasta IS NOT NULL
                      AND a.vigencia_hasta <= CURRENT_DATE + INTERVAL '90 days'
                    GROUP BY a.id, p.id
                    ORDER BY a.vigencia_hasta ASC
                    LIMIT 12
                    """
                )
                vencimientos = [dict(row) for row in cur.fetchall()]

                facturado = Decimal(str(resumen.get("total_facturado") or 0))
                cobrado = Decimal(str(resumen.get("total_cobrado") or 0))
                ingreso_mensual = Decimal(str(resumen.get("ingreso_mensual_contratado") or 0))
                resumen["ingreso_anualizado"] = ingreso_mensual * Decimal("12")
                resumen["porcentaje_cobranza_monto"] = round((cobrado / facturado) * 100, 2) if facturado else 0
                resumen["concentracion_top5"] = round(
                    (sum(Decimal(str(item.get("valor_mensual") or 0)) for item in top_proveedores[:5]) / ingreso_mensual) * 100,
                    2,
                ) if ingreso_mensual else 0
                return {
                    "periodo": {"mes": periodo_mes, "anho": periodo_anho},
                    "resumen": resumen,
                    "top_proveedores": top_proveedores,
                    "mix_espacios": mix_espacios,
                    "ocupacion": ocupacion,
                    "vencimientos": vencimientos,
                }

    def save_acuerdo_cobranza(self, payload, cambiado_por=None):
        acuerdo_id = _parse_int(payload.get("acuerdo_id"))
        periodo_mes = _parse_int(payload.get("periodo_mes"))
        periodo_anho = _parse_int(payload.get("periodo_anho"))
        tipo_facturacion = str(payload.get("tipo_facturacion") or "alquiler").strip().lower()
        numero_factura = str(payload.get("numero_factura") or "").strip()
        monto_factura = Decimal(str(_parse_number(payload.get("monto_factura"))))
        fecha_factura = _parse_flexible_date(payload.get("fecha_factura"))
        cobrado = _parse_bool(payload.get("cobrado"), default=False)
        fecha_cobro = _parse_flexible_date(payload.get("fecha_cobro"))
        forma_cobro = str(payload.get("forma_cobro") or "").strip().lower()
        observaciones = str(payload.get("observaciones") or "").strip()
        formas_cobro = {"factura_canje", "transferencia", "efectivo", "cheque", "otro"}
        tipos_facturacion = {"alquiler", "porcentaje_venta", "ambos"}
        if not acuerdo_id:
            raise ValueError("El acuerdo_id es obligatorio.")
        if periodo_mes < 1 or periodo_mes > 12:
            raise ValueError("El mes debe estar entre 1 y 12.")
        if periodo_anho < 2000 or periodo_anho > 2100:
            raise ValueError("El anho del periodo no es valido.")
        if not numero_factura:
            raise ValueError("El numero de factura es obligatorio.")
        if tipo_facturacion not in tipos_facturacion:
            raise ValueError("Tipo de facturacion invalido.")
        if forma_cobro and forma_cobro not in formas_cobro:
            raise ValueError("Forma de cobro invalida.")
        if cobrado and not fecha_cobro:
            fecha_cobro = date.today()
        if not cobrado:
            fecha_cobro = None
        with self._connect(readonly=False) as conn:
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT id FROM acuerdos_comerciales WHERE id = %s", (acuerdo_id,))
                    if not cur.fetchone():
                        raise ValueError("Acuerdo no encontrado.")
                    if tipo_facturacion == "ambos":
                        cur.execute(
                            """
                            DELETE FROM acuerdos_facturas
                            WHERE acuerdo_id = %s
                              AND periodo_anho = %s
                              AND periodo_mes = %s
                              AND tipo_facturacion IN ('alquiler', 'porcentaje_venta')
                            """,
                            (acuerdo_id, periodo_anho, periodo_mes),
                        )
                    else:
                        cur.execute(
                            """
                            DELETE FROM acuerdos_facturas
                            WHERE acuerdo_id = %s
                              AND periodo_anho = %s
                              AND periodo_mes = %s
                              AND tipo_facturacion = 'ambos'
                            """,
                            (acuerdo_id, periodo_anho, periodo_mes),
                        )
                    cur.execute(
                        """
                        INSERT INTO acuerdos_facturas(
                            acuerdo_id, periodo_anho, periodo_mes, numero_factura,
                            monto_factura, fecha_factura, tipo_facturacion, cobrado, fecha_cobro, forma_cobro, observaciones
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (acuerdo_id, periodo_anho, periodo_mes, tipo_facturacion)
                        DO UPDATE SET
                            numero_factura = EXCLUDED.numero_factura,
                            monto_factura = EXCLUDED.monto_factura,
                            fecha_factura = EXCLUDED.fecha_factura,
                            cobrado = EXCLUDED.cobrado,
                            fecha_cobro = EXCLUDED.fecha_cobro,
                            forma_cobro = EXCLUDED.forma_cobro,
                            observaciones = EXCLUDED.observaciones,
                            actualizado_en = NOW()
                        RETURNING id, acuerdo_id, periodo_anho, periodo_mes, numero_factura,
                                  monto_factura, fecha_factura, tipo_facturacion, cobrado, fecha_cobro, forma_cobro,
                                  observaciones, creado_en, actualizado_en
                        """,
                        (
                            acuerdo_id,
                            periodo_anho,
                            periodo_mes,
                            numero_factura,
                            monto_factura,
                            fecha_factura,
                            tipo_facturacion,
                            cobrado,
                            fecha_cobro,
                            forma_cobro,
                            observaciones,
                        ),
                    )
                    row = cur.fetchone()
                    cur.execute(
                        """
                        INSERT INTO acuerdos_historial(acuerdo_id, accion, usuario, cambios)
                        VALUES (%s, 'cobranza', %s, %s)
                        """,
                        (
                            acuerdo_id,
                            str(cambiado_por or "sistema").strip() or "sistema",
                            self._jsonb([
                                {
                                    "campo": "Cobranza",
                                    "antes": None,
                                    "despues": {
                                        "periodo": f"{periodo_mes:02d}/{periodo_anho}",
                                        "tipo_facturacion": tipo_facturacion,
                                        "numero_factura": numero_factura,
                                        "monto_factura": monto_factura,
                                        "cobrado": cobrado,
                                        "fecha_cobro": fecha_cobro,
                                        "forma_cobro": forma_cobro,
                                    },
                                }
                            ]),
                        ),
                    )
                conn.commit()
                return dict(row)
            except Exception:
                conn.rollback()
                raise

    def list_acuerdos_comerciales(self, search=None):
        term = str(search or "").strip()
        filters = []
        params: list[Any] = []
        if term:
            filters.append(
                """
                (
                    LOWER(p.nombre) LIKE %s
                    OR LOWER(COALESCE(p.ruc, '')) LIKE %s
                    OR LOWER(a.titulo) LIKE %s
                    OR LOWER(COALESCE(a.observaciones, '')) LIKE %s
                    OR EXISTS (
                        SELECT 1
                        FROM acuerdos_ubicaciones ux
                        WHERE ux.acuerdo_id = a.id
                          AND LOWER(ux.ubicacion) LIKE %s
                    )
                )
                """
            )
            like = f"%{term.lower()}%"
            params.extend([like, like, like, like, like])
        where = f"WHERE {' AND '.join(filters)}" if filters else ""
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT a.id,
                           a.proveedor_id,
                           p.nombre AS proveedor_nombre,
                           p.ruc AS proveedor_ruc,
                           p.telefono AS proveedor_telefono,
                           p.email AS proveedor_email,
                           a.titulo,
                           a.retorno_porcentaje,
                           a.duracion_meses,
                           a.vigencia_desde,
                           a.vigencia_hasta,
                           a.estado_renovacion,
                           a.acuerdo_origen_id,
                           a.renovado_por_acuerdo_id,
                           a.observaciones,
                           a.activo,
                           a.creado_en,
                           COALESCE(COUNT(u.id), 0)::INTEGER AS ubicaciones_count,
                           COALESCE(SUM(CASE WHEN LOWER(u.tipo_espacio) = 'puntera' THEN 1 ELSE 0 END), 0)::INTEGER AS punteras_count
                    FROM acuerdos_comerciales a
                    JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                    LEFT JOIN acuerdos_ubicaciones u ON u.acuerdo_id = a.id
                    {where}
                    GROUP BY a.id, p.id
                    ORDER BY a.activo DESC, p.nombre ASC, a.id DESC
                    LIMIT 200
                    """,
                    params,
                )
                acuerdos = [dict(row) for row in cur.fetchall()]
                if acuerdos:
                    ids = [row["id"] for row in acuerdos]
                    cur.execute(
                        """
                        SELECT id, acuerdo_id, sucursal, tipo_espacio, ubicacion,
                               codigo, bloque, numero, valor_gs, detalle, orden, tentativa
                        FROM acuerdos_ubicaciones
                        WHERE acuerdo_id = ANY(%s)
                        ORDER BY acuerdo_id, orden, id
                        """,
                        (ids,),
                    )
                    ubicaciones = [dict(row) for row in cur.fetchall()]
                else:
                    ubicaciones = []
                by_acuerdo: dict[int, list[dict[str, Any]]] = {}
                for ubicacion in ubicaciones:
                    by_acuerdo.setdefault(int(ubicacion["acuerdo_id"]), []).append(ubicacion)
                for acuerdo in acuerdos:
                    acuerdo["ubicaciones"] = by_acuerdo.get(int(acuerdo["id"]), [])
                return {"items": acuerdos}

    def list_acuerdos_proveedores(self, search=None):
        term = str(search or "").strip()
        filters = []
        params: list[Any] = []
        if term:
            filters.append(
                """
                (
                    LOWER(nombre) LIKE %s
                    OR LOWER(COALESCE(ruc, '')) LIKE %s
                    OR LOWER(COALESCE(telefono, '')) LIKE %s
                    OR LOWER(COALESCE(email, '')) LIKE %s
                )
                """
            )
            like = f"%{term.lower()}%"
            params.extend([like, like, like, like])
        where = f"WHERE {' AND '.join(filters)}" if filters else ""
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT p.id,
                           p.nombre,
                           p.ruc,
                           p.telefono,
                           p.email,
                           p.activo,
                           p.creado_en,
                           COUNT(a.id)::INTEGER AS acuerdos_count
                    FROM acuerdos_proveedores p
                    LEFT JOIN acuerdos_comerciales a ON a.proveedor_id = p.id
                    {where}
                    GROUP BY p.id
                    ORDER BY p.activo DESC, p.nombre ASC
                    LIMIT 300
                    """,
                    params,
                )
                return {"items": [dict(row) for row in cur.fetchall()]}

    def list_mapa_ubicaciones(self, sucursal="aregua"):
        sucursal = str(sucursal or "").strip().lower()
        if sucursal not in SUCURSALES:
            raise ValueError("Sucursal invalida.")
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    WITH confirmadas AS (
                        SELECT DISTINCT ON (u.sucursal, u.codigo)
                               u.sucursal,
                               u.codigo,
                               u.valor_gs,
                               u.detalle,
                               a.id AS acuerdo_id,
                               a.vigencia_hasta,
                               a.estado_renovacion,
                               p.nombre AS proveedor_nombre
                        FROM acuerdos_ubicaciones u
                        JOIN acuerdos_comerciales a
                          ON a.id = u.acuerdo_id
                         AND a.activo IS TRUE
                        JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                        WHERE u.tentativa IS FALSE
                        ORDER BY u.sucursal, u.codigo, u.id DESC
                    ),
                    tentativas AS (
                        SELECT DISTINCT ON (u.sucursal, u.codigo)
                               u.sucursal,
                               u.codigo,
                               u.valor_gs,
                               u.detalle,
                               a.id AS acuerdo_id,
                               a.vigencia_hasta,
                               a.estado_renovacion,
                               p.nombre AS proveedor_nombre
                        FROM acuerdos_ubicaciones u
                        JOIN acuerdos_comerciales a
                          ON a.id = u.acuerdo_id
                         AND a.activo IS TRUE
                         AND a.estado_renovacion = 'en_negociacion'
                        JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                        WHERE u.tentativa IS TRUE
                        ORDER BY u.sucursal, u.codigo, u.id DESC
                    )
                    SELECT m.id,
                           m.sucursal,
                           m.codigo,
                           m.bloque,
                           m.numero,
                           m.tipo_espacio,
                           COALESCE(t.valor_gs, c.valor_gs, m.valor_gs) AS valor_gs,
                           COALESCE(t.detalle, c.detalle, m.detalle) AS detalle,
                           COALESCE(t.acuerdo_id, c.acuerdo_id) AS acuerdo_id,
                           COALESCE(t.vigencia_hasta, c.vigencia_hasta) AS vigencia_hasta,
                           COALESCE(t.estado_renovacion, c.estado_renovacion) AS estado_renovacion,
                           COALESCE(t.proveedor_nombre, c.proveedor_nombre) AS proveedor_nombre,
                           (t.acuerdo_id IS NOT NULL) AS tentativa
                    FROM acuerdos_mapa_ubicaciones m
                    LEFT JOIN confirmadas c
                      ON c.sucursal = m.sucursal
                     AND c.codigo = m.codigo
                    LEFT JOIN tentativas t
                      ON t.sucursal = m.sucursal
                     AND t.codigo = m.codigo
                    WHERE m.sucursal = %s
                      AND m.activo IS TRUE
                    ORDER BY m.bloque, m.numero, m.tipo_espacio, m.codigo
                    """,
                    (sucursal,),
                )
                return {"items": [dict(row) for row in cur.fetchall()]}

    def save_mapa_ubicacion_valor(self, payload, cambiado_por=None):
        sucursal = str((payload or {}).get("sucursal") or "").strip().lower()
        codigo = str((payload or {}).get("codigo") or "").strip()
        valor_gs = Decimal(str(_parse_number((payload or {}).get("valor_gs"))))
        detalle = str((payload or {}).get("detalle") or "").strip()
        if sucursal not in SUCURSALES:
            raise ValueError("Sucursal invalida.")
        if not codigo:
            raise ValueError("El codigo de ubicacion es obligatorio.")
        if valor_gs < 0:
            raise ValueError("El valor no puede ser negativo.")
        with self._connect(readonly=False) as conn:
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        UPDATE acuerdos_mapa_ubicaciones
                        SET valor_gs = %s,
                            detalle = COALESCE(NULLIF(%s, ''), detalle),
                            actualizado_en = NOW()
                        WHERE sucursal = %s
                          AND codigo = %s
                          AND activo IS TRUE
                        RETURNING id, sucursal, codigo, bloque, numero, tipo_espacio, valor_gs, detalle
                        """,
                        (valor_gs, detalle, sucursal, codigo),
                    )
                    row = cur.fetchone()
                    if not row:
                        raise ValueError("Ubicacion no encontrada en el mapa.")
                    cur.execute(
                        """
                        UPDATE acuerdos_ubicaciones u
                        SET valor_gs = %s,
                            detalle = COALESCE(NULLIF(%s, ''), u.detalle)
                        FROM acuerdos_comerciales a
                        WHERE a.id = u.acuerdo_id
                          AND a.activo IS TRUE
                          AND u.tentativa IS FALSE
                          AND u.sucursal = %s
                          AND u.codigo = %s
                        RETURNING u.acuerdo_id
                        """,
                        (valor_gs, detalle, sucursal, codigo),
                    )
                    acuerdo_ids = sorted({int(item["acuerdo_id"]) for item in cur.fetchall()})
                    for acuerdo_id in acuerdo_ids:
                        cur.execute(
                            """
                            INSERT INTO acuerdos_historial(acuerdo_id, accion, usuario, cambios)
                            VALUES (%s, 'valor_ubicacion', %s, %s)
                            """,
                            (
                                acuerdo_id,
                                str(cambiado_por or "sistema").strip() or "sistema",
                                self._jsonb([
                                    {
                                        "campo": "Valor ubicacion",
                                        "antes": None,
                                        "despues": {"codigo": codigo, "sucursal": sucursal, "valor_gs": valor_gs},
                                    }
                                ]),
                            ),
                        )
                conn.commit()
                result = dict(row)
                result["acuerdos_actualizados"] = len(acuerdo_ids)
                return result
            except Exception:
                conn.rollback()
                raise

    def save_acuerdos_proveedor(self, payload, cambiado_por=None):
        proveedor_id = payload.get("id")
        nombre = str(payload.get("nombre") or "").strip()
        ruc = str(payload.get("ruc") or "").strip()
        telefono = str(payload.get("telefono") or "").strip()
        email = str(payload.get("email") or "").strip()
        activo = _parse_bool(payload.get("activo"), default=True)
        if not nombre:
            raise ValueError("El nombre del proveedor es obligatorio.")
        with self._connect(readonly=False) as conn:
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    anterior = None
                    if proveedor_id:
                        cur.execute(
                            """
                            SELECT id, nombre, ruc, telefono, email, activo
                            FROM acuerdos_proveedores
                            WHERE id = %s
                            """,
                            (int(proveedor_id),),
                        )
                        anterior = cur.fetchone()
                        cur.execute(
                            """
                            UPDATE acuerdos_proveedores
                            SET nombre = %s,
                                ruc = %s,
                                telefono = %s,
                                email = %s,
                                activo = %s,
                                actualizado_en = NOW()
                            WHERE id = %s
                            RETURNING id, nombre, ruc, telefono, email, activo, creado_en
                            """,
                            (nombre, ruc, telefono, email, activo, int(proveedor_id)),
                        )
                    else:
                        cur.execute(
                            """
                            INSERT INTO acuerdos_proveedores(nombre, ruc, telefono, email, activo)
                            VALUES (%s, %s, %s, %s, %s)
                            RETURNING id, nombre, ruc, telefono, email, activo, creado_en
                            """,
                            (nombre, ruc, telefono, email, activo),
                        )
                    row = cur.fetchone()
                    if not row:
                        raise ValueError("Proveedor no encontrado.")
                    if proveedor_id and anterior:
                        cambios = []
                        nuevo = dict(row)
                        for field, label in (
                            ("nombre", "Proveedor"),
                            ("ruc", "RUC"),
                            ("telefono", "Telefono"),
                            ("email", "Email"),
                            ("activo", "Estado"),
                        ):
                            if anterior.get(field) != nuevo.get(field):
                                cambios.append({"campo": label, "antes": anterior.get(field), "despues": nuevo.get(field)})
                        if cambios:
                            cur.execute(
                                """
                                INSERT INTO acuerdos_historial(acuerdo_id, accion, usuario, cambios)
                                SELECT id, 'proveedor_actualizacion', %s, %s::jsonb
                                FROM acuerdos_comerciales
                                WHERE proveedor_id = %s
                                """,
                                (
                                    str(cambiado_por or "sistema").strip() or "sistema",
                                    self._jsonb(cambios),
                                    int(proveedor_id),
                                ),
                            )
                conn.commit()
                return row
            except psycopg2.errors.UniqueViolation:
                conn.rollback()
                raise ValueError("Ya existe un proveedor con ese nombre y RUC.")
            except Exception:
                conn.rollback()
                raise

    def _jsonb(self, value):
        return psycopg2.extras.Json(value, dumps=lambda item: json.dumps(item, default=_json_default))

    def _fetch_acuerdo_historial_snapshot(self, cur, acuerdo_id):
        cur.execute(
            """
            SELECT a.id,
                   a.proveedor_id,
                   p.nombre AS proveedor_nombre,
                   p.ruc AS proveedor_ruc,
                   p.telefono AS proveedor_telefono,
                   p.email AS proveedor_email,
                   a.titulo,
                   a.retorno_porcentaje,
                   a.duracion_meses,
                   a.vigencia_desde,
                   a.vigencia_hasta,
                   a.estado_renovacion,
                   a.acuerdo_origen_id,
                   a.renovado_por_acuerdo_id,
                   a.observaciones,
                   a.activo
            FROM acuerdos_comerciales a
            JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
            WHERE a.id = %s
            """,
            (int(acuerdo_id),),
        )
        acuerdo = cur.fetchone()
        if not acuerdo:
            return None
        snapshot = dict(acuerdo)
        cur.execute(
            """
            SELECT sucursal, tipo_espacio, ubicacion, codigo, bloque, numero, valor_gs, detalle, orden, tentativa
            FROM acuerdos_ubicaciones
            WHERE acuerdo_id = %s
            ORDER BY orden, id
            """,
            (int(acuerdo_id),),
        )
        snapshot["ubicaciones"] = [dict(row) for row in cur.fetchall()]
        return snapshot

    def _acuerdo_historial_value(self, snapshot, field):
        value = (snapshot or {}).get(field)
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        return value

    def _acuerdo_ubicaciones_historial_value(self, snapshot):
        ubicaciones = (snapshot or {}).get("ubicaciones") or []
        return [
            {
                "sucursal": item.get("sucursal"),
                "tipo_espacio": item.get("tipo_espacio"),
                "ubicacion": item.get("ubicacion"),
                "codigo": item.get("codigo") or "",
                "bloque": item.get("bloque") or "",
                "numero": item.get("numero"),
                "valor_gs": self._acuerdo_historial_value(item, "valor_gs"),
                "detalle": item.get("detalle") or "",
                "orden": item.get("orden"),
                "tentativa": bool(item.get("tentativa")),
            }
            for item in ubicaciones
        ]

    def _build_acuerdo_historial_cambios(self, anterior, nuevo):
        if not anterior:
            return [{"campo": "acuerdo", "antes": None, "despues": "creado"}]
        fields = [
            ("proveedor_id", "Proveedor"),
            ("titulo", "Titulo"),
            ("retorno_porcentaje", "Retorno"),
            ("duracion_meses", "Duracion"),
            ("vigencia_desde", "Vigencia desde"),
            ("vigencia_hasta", "Vigencia hasta"),
            ("estado_renovacion", "Estado renovacion"),
            ("acuerdo_origen_id", "Acuerdo origen"),
            ("renovado_por_acuerdo_id", "Renovado por acuerdo"),
            ("observaciones", "Observaciones"),
            ("activo", "Estado"),
        ]
        cambios = []
        for field, label in fields:
            antes = self._acuerdo_historial_value(anterior, field)
            despues = self._acuerdo_historial_value(nuevo, field)
            if antes != despues:
                cambios.append({"campo": label, "antes": antes, "despues": despues})
        antes_ubicaciones = self._acuerdo_ubicaciones_historial_value(anterior)
        despues_ubicaciones = self._acuerdo_ubicaciones_historial_value(nuevo)
        if antes_ubicaciones != despues_ubicaciones:
            cambios.append({"campo": "Ubicaciones", "antes": antes_ubicaciones, "despues": despues_ubicaciones})
        return cambios

    def _insert_acuerdo_historial(self, cur, acuerdo_id, accion, usuario, anterior, nuevo):
        cambios = self._build_acuerdo_historial_cambios(anterior, nuevo)
        if accion == "actualizacion" and not cambios:
            return
        cur.execute(
            """
            INSERT INTO acuerdos_historial(acuerdo_id, accion, usuario, cambios, anterior, nuevo)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                int(acuerdo_id),
                accion,
                str(usuario or "sistema").strip() or "sistema",
                self._jsonb(cambios),
                self._jsonb(anterior) if anterior else None,
                self._jsonb(nuevo) if nuevo else None,
            ),
        )

    def _validate_mapa_ubicaciones(
        self,
        cur,
        clean_ubicaciones,
        acuerdo_id=None,
        acuerdo_origen_id=None,
        proveedor_id=None,
        proveedor_nombre=None,
        permitir_ocupadas_mismo_proveedor=False,
    ):
        seen = set()
        proveedor_ids_permitidos = set()
        proveedor_keys_permitidos = set()
        if proveedor_id:
            proveedor_ids_permitidos.add(int(proveedor_id))
        if proveedor_nombre:
            proveedor_keys_permitidos.add(_normalize_proveedor_key(proveedor_nombre))
        ids_base = [int(value) for value in (acuerdo_id, acuerdo_origen_id) if value]
        if ids_base:
            cur.execute(
                """
                SELECT a.proveedor_id, p.nombre AS proveedor_nombre
                FROM acuerdos_comerciales a
                JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                WHERE a.id = ANY(%s)
                """,
                (ids_base,),
            )
            for row in cur.fetchall():
                proveedor_ids_permitidos.add(int(row["proveedor_id"]))
                proveedor_keys_permitidos.add(_normalize_proveedor_key(row.get("proveedor_nombre")))

        # En contexto de renovacion, siempre permitir las ubicaciones del propio proveedor.
        es_contexto_renovacion = bool(acuerdo_origen_id) or permitir_ocupadas_mismo_proveedor

        for sucursal, tipo, _ubicacion, codigo, _bloque, _numero, _valor_gs, _detalle, _orden in clean_ubicaciones:
            key = (sucursal, codigo)
            if key in seen:
                raise ValueError(f"La ubicacion {codigo} esta repetida en el acuerdo.")
            seen.add(key)
            cur.execute(
                """
                SELECT tipo_espacio
                FROM acuerdos_mapa_ubicaciones
                WHERE sucursal = %s
                  AND codigo = %s
                  AND activo IS TRUE
                """,
                (sucursal, codigo),
            )
            catalog = cur.fetchone()
            if not catalog:
                raise ValueError(f"La ubicacion {codigo} no existe en el mapa de {sucursal}.")
            if str(catalog.get("tipo_espacio") or "") != tipo:
                raise ValueError(f"La ubicacion {codigo} no corresponde al tipo seleccionado.")
            cur.execute(
                """
                SELECT u.acuerdo_id, a.proveedor_id, p.nombre AS proveedor_nombre
                FROM acuerdos_ubicaciones u
                JOIN acuerdos_comerciales a ON a.id = u.acuerdo_id AND a.activo IS TRUE
                JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                WHERE u.sucursal = %s
                  AND u.codigo = %s
                  AND u.tentativa IS FALSE
                  AND LOWER(BTRIM(p.nombre)) <> 'libre'
                """,
                (sucursal, codigo),
            )
            for occupied in cur.fetchall():
                occupied_acuerdo_id = int(occupied["acuerdo_id"])
                occupied_proveedor_id = int(occupied["proveedor_id"])
                # Permitir: es el mismo acuerdo que se está editando
                if acuerdo_id and occupied_acuerdo_id == int(acuerdo_id):
                    continue
                # Permitir: es el acuerdo origen que se está renovando
                if acuerdo_origen_id and occupied_acuerdo_id == int(acuerdo_origen_id):
                    continue
                # Permitir: pertenece al mismo proveedor (durante negociacion o renovacion)
                if es_contexto_renovacion and occupied_proveedor_id in proveedor_ids_permitidos:
                    continue
                if es_contexto_renovacion and _normalize_proveedor_key(occupied.get("proveedor_nombre")) in proveedor_keys_permitidos:
                    continue
                # Bloquear: la ubicacion pertenece a otro proveedor distinto
                raise ValueError(f"La ubicacion {codigo} ya esta asignada a {occupied.get('proveedor_nombre')}.")

    def save_acuerdo_comercial(self, payload, cambiado_por=None):
        acuerdo_id = payload.get("id")
        proveedor = payload.get("proveedor") or {}
        proveedor_id = proveedor.get("id") or payload.get("proveedor_id")
        proveedor_nombre = str(proveedor.get("nombre") or payload.get("proveedor_nombre") or "").strip()
        proveedor_ruc = str(proveedor.get("ruc") or payload.get("proveedor_ruc") or "").strip()
        proveedor_telefono = str(proveedor.get("telefono") or "").strip()
        proveedor_email = str(proveedor.get("email") or "").strip()
        titulo = str(payload.get("titulo") or "").strip()
        retorno = _parse_number(payload.get("retorno_porcentaje"))
        duracion_meses = _parse_int(payload.get("duracion_meses")) if payload.get("duracion_meses") not in (None, "") else None
        vigencia_desde = _parse_flexible_date(payload.get("vigencia_desde"))
        vigencia_hasta = _parse_flexible_date(payload.get("vigencia_hasta"))
        estado_renovacion = str(payload.get("estado_renovacion") or "vigente").strip().lower()
        acuerdo_origen_id = payload.get("acuerdo_origen_id")
        observaciones = str(payload.get("observaciones") or "").strip()
        activo = _parse_bool(payload.get("activo"), default=True)
        ubicaciones = payload.get("ubicaciones") or []
        estados_renovacion = {"vigente", "por_renovar", "en_negociacion", "renovado", "no_renovado", "vencido"}
        ubicaciones_tentativas = estado_renovacion == "en_negociacion"

        if not proveedor_id and not proveedor_nombre:
            raise ValueError("El proveedor es obligatorio.")
        if not titulo:
            titulo = f"Acuerdo comercial {proveedor_nombre}".strip()
        if retorno < 0:
            raise ValueError("El retorno no puede ser negativo.")
        if duracion_meses is not None and duracion_meses <= 0:
            raise ValueError("La duracion en meses debe ser mayor a cero.")
        if vigencia_desde and vigencia_hasta and vigencia_hasta < vigencia_desde:
            raise ValueError("La fecha fin no puede ser anterior a la fecha inicio.")
        if estado_renovacion not in estados_renovacion:
            raise ValueError("Estado de renovacion invalido.")
        if acuerdo_origen_id in ("", None):
            acuerdo_origen_id = None
        elif acuerdo_id and int(acuerdo_origen_id) == int(acuerdo_id):
            raise ValueError("El acuerdo origen no puede ser el mismo acuerdo.")
        else:
            acuerdo_origen_id = int(acuerdo_origen_id)
        if not isinstance(ubicaciones, list) or len(ubicaciones) == 0:
            raise ValueError("Carga al menos una ubicacion del acuerdo.")

        clean_ubicaciones = []
        for index, item in enumerate(ubicaciones, start=1):
            sucursal = str((item or {}).get("sucursal") or "").strip().lower()
            tipo = str((item or {}).get("tipo_espacio") or "").strip().lower()
            ubicacion = str((item or {}).get("ubicacion") or "").strip()
            codigo = str((item or {}).get("codigo") or "").strip()
            bloque = str((item or {}).get("bloque") or "").strip()
            numero = _parse_int((item or {}).get("numero")) if (item or {}).get("numero") not in (None, "") else None
            valor_gs = Decimal(str(_parse_number((item or {}).get("valor_gs")))) if (item or {}).get("valor_gs") not in (None, "") else None
            detalle = str((item or {}).get("detalle") or "").strip()
            if sucursal not in SUCURSALES:
                raise ValueError("Sucursal invalida en ubicaciones.")
            if tipo not in {"puntera", "pestana", "tramo_gondola", "isla", "espacio_gondola_frio"}:
                raise ValueError("Tipo de espacio invalido.")
            if not codigo:
                raise ValueError("Selecciona una ubicacion del mapa. No se permiten ubicaciones manuales.")
            if not ubicacion:
                ubicacion = codigo
            clean_ubicaciones.append((sucursal, tipo, ubicacion, codigo, bloque, numero, valor_gs, detalle, index))

        with self._connect(readonly=False) as conn:
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    snapshot_anterior = self._fetch_acuerdo_historial_snapshot(cur, acuerdo_id) if acuerdo_id else None
                    if proveedor_id:
                        cur.execute(
                            """
                            UPDATE acuerdos_proveedores
                            SET nombre = COALESCE(NULLIF(%s, ''), nombre),
                                ruc = %s,
                                telefono = %s,
                                email = %s,
                                actualizado_en = NOW()
                            WHERE id = %s
                            RETURNING id
                            """,
                            (proveedor_nombre, proveedor_ruc, proveedor_telefono, proveedor_email, int(proveedor_id)),
                        )
                        row = cur.fetchone()
                        if not row:
                            raise ValueError("Proveedor no encontrado.")
                        proveedor_id = int(row["id"])
                    else:
                        cur.execute(
                            """
                            INSERT INTO acuerdos_proveedores(nombre, ruc, telefono, email)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT (LOWER(BTRIM(nombre)), LOWER(BTRIM(COALESCE(ruc, ''))))
                            DO UPDATE SET telefono = EXCLUDED.telefono,
                                          email = EXCLUDED.email,
                                          actualizado_en = NOW()
                            RETURNING id
                            """,
                            (proveedor_nombre, proveedor_ruc, proveedor_telefono, proveedor_email),
                        )
                        proveedor_id = int(cur.fetchone()["id"])

                    if acuerdo_origen_id:
                        cur.execute(
                            """
                            SELECT id, estado_renovacion, renovado_por_acuerdo_id
                            FROM acuerdos_comerciales
                            WHERE id = %s
                            """,
                            (acuerdo_origen_id,),
                        )
                        acuerdo_origen = cur.fetchone()
                        if not acuerdo_origen:
                            raise ValueError("Acuerdo origen no encontrado.")
                        renovado_por = acuerdo_origen.get("renovado_por_acuerdo_id")
                        if renovado_por and (not acuerdo_id or int(renovado_por) != int(acuerdo_id)):
                            raise ValueError(
                                f"El acuerdo origen ya fue renovado por el acuerdo #{renovado_por}. "
                                "Solo se puede renovar el ultimo acuerdo de la cadena."
                            )
                        if str(acuerdo_origen.get("estado_renovacion") or "").lower() == "renovado" and not renovado_por:
                            raise ValueError("El acuerdo origen ya figura como renovado.")

                    self._validate_mapa_ubicaciones(
                        cur,
                        clean_ubicaciones,
                        acuerdo_id=acuerdo_id,
                        acuerdo_origen_id=acuerdo_origen_id,
                        proveedor_id=proveedor_id,
                        proveedor_nombre=proveedor_nombre,
                        permitir_ocupadas_mismo_proveedor=estado_renovacion == "en_negociacion",
                    )

                    if acuerdo_id:
                        cur.execute(
                            """
                            UPDATE acuerdos_comerciales
                            SET proveedor_id = %s,
                                titulo = %s,
                                retorno_porcentaje = %s,
                                duracion_meses = %s,
                                vigencia_desde = %s,
                                vigencia_hasta = %s,
                                estado_renovacion = %s,
                                acuerdo_origen_id = %s,
                                observaciones = %s,
                                activo = %s,
                                actualizado_en = NOW()
                            WHERE id = %s
                            RETURNING id
                            """,
                            (
                                proveedor_id,
                                titulo,
                                retorno,
                                duracion_meses,
                                vigencia_desde,
                                vigencia_hasta,
                                estado_renovacion,
                                acuerdo_origen_id,
                                observaciones,
                                activo,
                                int(acuerdo_id),
                            ),
                        )
                        row = cur.fetchone()
                        if not row:
                            raise ValueError("Acuerdo no encontrado.")
                        acuerdo_id = int(row["id"])
                        cur.execute("DELETE FROM acuerdos_ubicaciones WHERE acuerdo_id = %s", (acuerdo_id,))
                    else:
                        cur.execute(
                            """
                            INSERT INTO acuerdos_comerciales(
                                proveedor_id, titulo, retorno_porcentaje, duracion_meses, vigencia_desde, vigencia_hasta,
                                estado_renovacion, acuerdo_origen_id, observaciones, activo
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING id
                            """,
                            (
                                proveedor_id,
                                titulo,
                                retorno,
                                duracion_meses,
                                vigencia_desde,
                                vigencia_hasta,
                                estado_renovacion,
                                acuerdo_origen_id,
                                observaciones,
                                activo,
                            ),
                        )
                        acuerdo_id = int(cur.fetchone()["id"])
                    if acuerdo_origen_id and estado_renovacion == "vigente":
                        cur.execute(
                            """
                            UPDATE acuerdos_comerciales
                            SET estado_renovacion = 'renovado',
                                renovado_por_acuerdo_id = %s,
                                actualizado_en = NOW()
                            WHERE id = %s
                              AND (
                                  renovado_por_acuerdo_id IS NULL
                                  OR renovado_por_acuerdo_id = %s
                              )
                            """,
                            (acuerdo_id, acuerdo_origen_id, acuerdo_id),
                        )

                    if acuerdo_origen_id and estado_renovacion == "vigente":
                        for sucursal, _tipo, _ubicacion, codigo, _bloque, _numero, _valor_gs, _detalle, _orden in clean_ubicaciones:
                            cur.execute(
                                """
                                DELETE FROM acuerdos_ubicaciones
                                WHERE acuerdo_id = %s
                                  AND sucursal = %s
                                  AND codigo = %s
                                """,
                                (acuerdo_origen_id, sucursal, codigo),
                            )

                    cur.executemany(
                        """
                        INSERT INTO acuerdos_ubicaciones(
                            acuerdo_id, sucursal, tipo_espacio, ubicacion, codigo, bloque,
                            numero, valor_gs, detalle, orden, tentativa
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        [(acuerdo_id, *item, ubicaciones_tentativas) for item in clean_ubicaciones],
                    )
                    snapshot_nuevo = self._fetch_acuerdo_historial_snapshot(cur, acuerdo_id)
                    self._insert_acuerdo_historial(
                        cur,
                        acuerdo_id,
                        "actualizacion" if snapshot_anterior else "creacion",
                        cambiado_por,
                        snapshot_anterior,
                        snapshot_nuevo,
                    )
                conn.commit()
            except Exception:
                conn.rollback()
                raise
        return self.get_acuerdo_comercial(acuerdo_id)

    def descartar_negociacion(self, acuerdo_id, cambiado_por=None):
        acuerdo_id = _parse_int(acuerdo_id)
        if not acuerdo_id:
            raise ValueError("El acuerdo_id es obligatorio.")

        with self._connect(readonly=False) as conn:
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT id, estado_renovacion, acuerdo_origen_id, renovado_por_acuerdo_id
                        FROM acuerdos_comerciales
                        WHERE id = %s
                        """,
                        (acuerdo_id,),
                    )
                    acuerdo = cur.fetchone()
                    if not acuerdo:
                        raise ValueError("Negociacion no encontrada.")
                    if str(acuerdo.get("estado_renovacion") or "").lower() != "en_negociacion":
                        raise ValueError("Solo se pueden descartar acuerdos en negociacion.")
                    if not acuerdo.get("acuerdo_origen_id"):
                        raise ValueError("Esta negociacion no tiene acuerdo origen; revisala antes de eliminar.")
                    if acuerdo.get("renovado_por_acuerdo_id"):
                        raise ValueError("No se puede descartar una negociacion que ya fue renovada.")

                    cur.execute(
                        """
                        UPDATE acuerdos_comerciales
                        SET renovado_por_acuerdo_id = NULL,
                            estado_renovacion = CASE
                                WHEN estado_renovacion = 'renovado' THEN 'vigente'
                                ELSE estado_renovacion
                            END,
                            actualizado_en = NOW()
                        WHERE renovado_por_acuerdo_id = %s
                        """,
                        (acuerdo_id,),
                    )

                    cur.execute("DELETE FROM acuerdos_comerciales WHERE id = %s", (acuerdo_id,))
                conn.commit()
            except Exception:
                conn.rollback()
                raise
        return {"ok": True, "id": acuerdo_id}

    def eliminar_acuerdo(self, acuerdo_id, password, cambiado_por=None):
        acuerdo_id = _parse_int(acuerdo_id)
        if not acuerdo_id:
            raise ValueError("El acuerdo_id es obligatorio.")
        if str(password or "") != "alfaomega":
            raise ValueError("Contrasena de eliminacion incorrecta.")

        with self._connect(readonly=False) as conn:
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT id
                        FROM acuerdos_comerciales
                        WHERE id = %s
                        """,
                        (acuerdo_id,),
                    )
                    if not cur.fetchone():
                        raise ValueError("Acuerdo no encontrado.")
                    cur.execute(
                        """
                        UPDATE acuerdos_comerciales
                        SET renovado_por_acuerdo_id = NULL,
                            estado_renovacion = CASE
                                WHEN renovado_por_acuerdo_id = %s AND estado_renovacion = 'renovado' THEN 'vigente'
                                ELSE estado_renovacion
                            END,
                            actualizado_en = NOW()
                        WHERE renovado_por_acuerdo_id = %s
                        """,
                        (acuerdo_id, acuerdo_id),
                    )
                    cur.execute(
                        """
                        UPDATE acuerdos_comerciales
                        SET acuerdo_origen_id = NULL,
                            actualizado_en = NOW()
                        WHERE acuerdo_origen_id = %s
                        """,
                        (acuerdo_id,),
                    )
                    cur.execute("DELETE FROM acuerdos_comerciales WHERE id = %s", (acuerdo_id,))
                conn.commit()
            except Exception:
                conn.rollback()
                raise
        return {"ok": True, "id": acuerdo_id}

    def import_ubicaciones_aregua(self, raw_text, cambiado_por=None):
        rows = self._parse_ubicaciones_import(raw_text)
        if not rows:
            raise ValueError("No se encontraron ubicaciones para importar.")

        creados = 0
        actualizados = 0
        acuerdos_creados = 0
        proveedores_creados = 0
        acuerdos_afectados = set()
        with self._connect(readonly=False) as conn:
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    for index, row in enumerate(rows, start=1):
                        cur.execute(
                            """
                            INSERT INTO acuerdos_mapa_ubicaciones(sucursal, codigo, bloque, numero, tipo_espacio, valor_gs)
                            VALUES ('aregua', %s, %s, %s, %s, %s)
                            ON CONFLICT (sucursal, codigo)
                            DO UPDATE SET bloque = EXCLUDED.bloque,
                                          numero = EXCLUDED.numero,
                                          tipo_espacio = EXCLUDED.tipo_espacio,
                                          valor_gs = EXCLUDED.valor_gs,
                                          activo = TRUE,
                                          actualizado_en = NOW()
                            """,
                            (row["codigo"], row["bloque"], row["numero"], row["tipo_espacio"], row["valor_gs"]),
                        )
                        if self._is_import_libre(row["proveedor"]):
                            cur.execute(
                                """
                                DELETE FROM acuerdos_ubicaciones
                                WHERE sucursal = 'aregua'
                                  AND codigo = %s
                                RETURNING acuerdo_id
                                """,
                                (row["codigo"],),
                            )
                            liberados = cur.fetchall()
                            if liberados:
                                acuerdos_afectados.update(
                                    int(item["acuerdo_id"])
                                    for item in liberados
                                    if item.get("acuerdo_id")
                                )
                                actualizados += len(liberados)
                            continue
                        proveedor_id, proveedor_creado = self._upsert_import_proveedor(cur, row["proveedor"])
                        if proveedor_creado:
                            proveedores_creados += 1
                        acuerdo_id, acuerdo_creado = self._ensure_import_acuerdo(cur, proveedor_id, row["proveedor"])
                        if acuerdo_creado:
                            acuerdos_creados += 1
                        detalle = f"Bloque {row['bloque']} - N {row['numero']}".strip()
                        cur.execute(
                            """
                            SELECT id
                                 , acuerdo_id
                            FROM acuerdos_ubicaciones
                            WHERE sucursal = 'aregua'
                              AND LOWER(BTRIM(COALESCE(codigo, ''))) = LOWER(BTRIM(%s))
                            LIMIT 1
                            """,
                            (row["codigo"],),
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
                                    orden = %s
                                WHERE id = %s
                                """,
                                (
                                    acuerdo_id,
                                    row["tipo_espacio"],
                                    row["codigo"],
                                    row["codigo"],
                                    row["bloque"],
                                    row["numero"],
                                    row["valor_gs"],
                                    detalle,
                                    index,
                                    int(existing["id"]),
                                ),
                            )
                            actualizados += 1
                            acuerdos_afectados.add(acuerdo_id)
                            if existing.get("acuerdo_id"):
                                acuerdos_afectados.add(int(existing["acuerdo_id"]))
                        else:
                            cur.execute(
                                """
                                INSERT INTO acuerdos_ubicaciones(
                                    acuerdo_id, sucursal, tipo_espacio, ubicacion, codigo,
                                    bloque, numero, valor_gs, detalle, orden
                                )
                                VALUES (%s, 'aregua', %s, %s, %s, %s, %s, %s, %s, %s)
                                """,
                                (
                                    acuerdo_id,
                                    row["tipo_espacio"],
                                    row["codigo"],
                                    row["codigo"],
                                    row["bloque"],
                                    row["numero"],
                                    row["valor_gs"],
                                    detalle,
                                    index,
                                ),
                            )
                            creados += 1
                            acuerdos_afectados.add(acuerdo_id)
                    if acuerdos_afectados:
                        cur.execute(
                            """
                            INSERT INTO acuerdos_historial(acuerdo_id, accion, usuario, cambios)
                            SELECT a.id,
                                   'importacion_ubicaciones',
                                   %s,
                                   %s::jsonb
                            FROM acuerdos_comerciales a
                            WHERE a.id = ANY(%s)
                            """,
                            (
                                str(cambiado_por or "sistema").strip() or "sistema",
                                self._jsonb([
                                    {
                                        "campo": "Ubicaciones Aregua",
                                        "antes": None,
                                        "despues": f"{creados} creadas, {actualizados} actualizadas",
                                    }
                                ]),
                                list(acuerdos_afectados),
                            ),
                        )
                conn.commit()
            except Exception:
                conn.rollback()
                raise
        return {
            "ok": True,
            "leidas": len(rows),
            "creadas": creados,
            "actualizadas": actualizados,
            "proveedores_creados": proveedores_creados,
            "acuerdos_creados": acuerdos_creados,
        }

    def _is_import_libre(self, value):
        return str(value or "").strip().lower() == "libre"

    def _parse_ubicaciones_import(self, raw_text):
        text = str(raw_text or "").strip()
        if not text:
            return []
        parsed = []
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            columns = self._split_import_line(line)
            if len(columns) < 3:
                continue
            if columns[0].strip().lower() in {"codigo", "código", "bloque"}:
                continue
            if len(columns) >= 6:
                codigo = columns[0].strip()
                bloque = columns[1].strip()
                numero = _parse_int(columns[2])
                tipo_raw = columns[3].strip().lower()
                proveedor = columns[4].strip()
                valor_gs = Decimal(str(_parse_number(columns[5])))
            elif len(columns) >= 5:
                bloque = columns[0].strip()
                codigo = columns[1].strip()
                numero = self._infer_import_numero(codigo)
                tipo_raw = columns[2].strip().lower()
                proveedor = columns[3].strip()
                valor_gs = Decimal(str(_parse_number(columns[4])))
            elif len(columns) == 4:
                codigo = columns[0].strip()
                bloque = self._infer_import_bloque(codigo)
                numero = self._infer_import_numero(codigo)
                tipo_raw = columns[1].strip().lower()
                proveedor = columns[2].strip()
                valor_gs = Decimal(str(_parse_number(columns[3])))
            else:
                codigo = columns[0].strip()
                bloque = self._infer_import_bloque(codigo)
                numero = self._infer_import_numero(codigo)
                tipo_raw = "puntera"
                proveedor = columns[1].strip()
                valor_gs = Decimal(str(_parse_number(columns[2])))
            if not codigo or not bloque or not proveedor:
                continue
            tipo_espacio = "puntera" if "puntera" in tipo_raw else "pestana"
            parsed.append(
                {
                    "codigo": codigo,
                    "bloque": bloque,
                    "numero": numero,
                    "tipo_espacio": tipo_espacio,
                    "proveedor": proveedor,
                    "valor_gs": valor_gs,
                }
            )
        return parsed

    def _infer_import_numero(self, codigo):
        match = re.search(r"-P?(\d+)", str(codigo or ""), flags=re.IGNORECASE)
        if not match:
            raise ValueError(f"No se pudo detectar el numero de la ubicacion {codigo}.")
        return int(match.group(1))

    def _infer_import_bloque(self, codigo):
        text = str(codigo or "").strip().upper()
        if text.startswith("LC-"):
            return "LC"
        if text.startswith("PA-A-") or text.startswith("PA-B-"):
            return "PAN"
        if re.match(r"^A-P\d+", text):
            return "PA"
        if re.match(r"^B-P\d+", text):
            return "PB"
        match = re.match(r"^([A-D])-", text)
        if not match:
            raise ValueError(f"No se pudo detectar el bloque de la ubicacion {codigo}.")
        return match.group(1)

    def _split_import_line(self, line):
        if "\t" in line:
            return [part.strip() for part in line.split("\t")]
        if ";" in line:
            return next(csv.reader(StringIO(line), delimiter=";"))
        if "," in line:
            return next(csv.reader(StringIO(line)))
        return [part.strip() for part in re.split(r"\s{2,}", line) if part.strip()]

    def _upsert_import_proveedor(self, cur, nombre):
        cur.execute(
            """
            INSERT INTO acuerdos_proveedores(nombre, ruc, telefono, email)
            VALUES (%s, '', '', '')
            ON CONFLICT (LOWER(BTRIM(nombre)), LOWER(BTRIM(COALESCE(ruc, ''))))
            DO UPDATE SET actualizado_en = NOW()
            RETURNING id, (xmax = 0) AS creado
            """,
            (str(nombre or "").strip(),),
        )
        row = cur.fetchone()
        return int(row["id"]), bool(row.get("creado"))

    def _ensure_import_acuerdo(self, cur, proveedor_id, proveedor_nombre):
        cur.execute(
            """
            SELECT id
            FROM acuerdos_comerciales
            WHERE proveedor_id = %s
              AND activo IS TRUE
            ORDER BY COALESCE(vigencia_desde, creado_en::date) DESC, id DESC
            LIMIT 1
            """,
            (int(proveedor_id),),
        )
        row = cur.fetchone()
        if row:
            return int(row["id"]), False
        titulo = f"Acuerdo comercial {proveedor_nombre}".strip()
        cur.execute(
            """
            INSERT INTO acuerdos_comerciales(
                proveedor_id, titulo, retorno_porcentaje, estado_renovacion, observaciones, activo
            )
            VALUES (%s, %s, 0, 'vigente', 'Creado por importacion de ubicaciones Aregua.', TRUE)
            RETURNING id
            """,
            (int(proveedor_id), titulo),
        )
        return int(cur.fetchone()["id"]), True

    def get_acuerdo_comercial(self, acuerdo_id):
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT a.id,
                           a.proveedor_id,
                           p.nombre AS proveedor_nombre,
                           p.ruc AS proveedor_ruc,
                           p.telefono AS proveedor_telefono,
                           p.email AS proveedor_email,
                           a.titulo,
                           a.retorno_porcentaje,
                           a.duracion_meses,
                           a.vigencia_desde,
                           a.vigencia_hasta,
                           a.estado_renovacion,
                           a.acuerdo_origen_id,
                           a.renovado_por_acuerdo_id,
                           a.observaciones,
                           a.activo,
                           a.creado_en,
                           COALESCE(COUNT(u.id), 0)::INTEGER AS ubicaciones_count,
                           COALESCE(SUM(CASE WHEN LOWER(u.tipo_espacio) = 'puntera' THEN 1 ELSE 0 END), 0)::INTEGER AS punteras_count
                    FROM acuerdos_comerciales a
                    JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                    LEFT JOIN acuerdos_ubicaciones u ON u.acuerdo_id = a.id
                    WHERE a.id = %s
                    GROUP BY a.id, p.id
                    """,
                    (int(acuerdo_id),),
                )
                acuerdo = cur.fetchone()
                if not acuerdo:
                    raise ValueError("Acuerdo no encontrado.")
                acuerdo = dict(acuerdo)
                cur.execute(
                    """
                    SELECT id, acuerdo_id, sucursal, tipo_espacio, ubicacion,
                           codigo, bloque, numero, valor_gs, detalle, orden, tentativa
                    FROM acuerdos_ubicaciones
                    WHERE acuerdo_id = %s
                    ORDER BY orden, id
                    """,
                    (int(acuerdo_id),),
                )
                acuerdo["ubicaciones"] = [dict(row) for row in cur.fetchall()]
                return acuerdo

    def list_acuerdos_por_proveedor(self, proveedor_id):
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT a.id,
                           a.proveedor_id,
                           p.nombre AS proveedor_nombre,
                           p.ruc AS proveedor_ruc,
                           p.telefono AS proveedor_telefono,
                           p.email AS proveedor_email,
                           a.titulo,
                           a.retorno_porcentaje,
                           a.duracion_meses,
                           a.vigencia_desde,
                           a.vigencia_hasta,
                           a.estado_renovacion,
                           a.acuerdo_origen_id,
                           a.renovado_por_acuerdo_id,
                           a.observaciones,
                           a.activo,
                           a.creado_en,
                           COALESCE(COUNT(u.id), 0)::INTEGER AS ubicaciones_count,
                           COALESCE(SUM(CASE WHEN LOWER(u.tipo_espacio) = 'puntera' THEN 1 ELSE 0 END), 0)::INTEGER AS punteras_count
                    FROM acuerdos_comerciales a
                    JOIN acuerdos_proveedores p ON p.id = a.proveedor_id
                    LEFT JOIN acuerdos_ubicaciones u ON u.acuerdo_id = a.id
                    WHERE a.proveedor_id = %s
                    GROUP BY a.id, p.id
                    ORDER BY COALESCE(a.vigencia_desde, a.creado_en::date) DESC, a.id DESC
                    """,
                    (int(proveedor_id),),
                )
                acuerdos = [dict(row) for row in cur.fetchall()]
                if not acuerdos:
                    return {"items": []}
                ids = [row["id"] for row in acuerdos]
                cur.execute(
                    """
                    SELECT id, acuerdo_id, sucursal, tipo_espacio, ubicacion,
                           codigo, bloque, numero, valor_gs, detalle, orden, tentativa
                    FROM acuerdos_ubicaciones
                    WHERE acuerdo_id = ANY(%s)
                    ORDER BY acuerdo_id, orden, id
                    """,
                    (ids,),
                )
                by_acuerdo: dict[int, list[dict[str, Any]]] = {}
                for row in cur.fetchall():
                    item = dict(row)
                    by_acuerdo.setdefault(int(item["acuerdo_id"]), []).append(item)
                for acuerdo in acuerdos:
                    acuerdo["ubicaciones"] = by_acuerdo.get(int(acuerdo["id"]), [])
                return {"items": acuerdos}

    def list_acuerdo_historial(self, acuerdo_id, limit=50):
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, acuerdo_id, accion, usuario, cambios, anterior, nuevo, creado_en
                    FROM acuerdos_historial
                    WHERE acuerdo_id = %s
                    ORDER BY creado_en DESC, id DESC
                    LIMIT %s
                    """,
                    (int(acuerdo_id), int(limit or 50)),
                )
                return {"items": [dict(row) for row in cur.fetchall()]}
