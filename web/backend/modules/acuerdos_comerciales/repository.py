from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import psycopg2
import psycopg2.extras


SUCURSALES = {
    "aregua": {"local": "AREGUA", "nombre": "Aregua"},
    "luque": {"local": "LUQUE", "nombre": "Luque"},
    "itaugua": {"local": "ITAUGUA", "nombre": "Itaugua"},
}


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


class AcuerdosComercialesRepository:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self._schema_ready = False

    def _connect(self, readonly=True):
        self._ensure_schema()
        conn = psycopg2.connect(self.db_url, connect_timeout=5)
        conn.set_session(readonly=readonly, autocommit=readonly)
        return conn

    def _ensure_schema(self):
        if self._schema_ready:
            return
        with psycopg2.connect(self.db_url, connect_timeout=5) as conn:
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
                        detalle TEXT NULL,
                        orden INTEGER NOT NULL DEFAULT 1
                    )
                    """
                )
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
                    CREATE INDEX IF NOT EXISTS idx_acuerdos_historial_acuerdo
                    ON acuerdos_historial(acuerdo_id, creado_en DESC)
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
            conn.commit()
        self._schema_ready = True
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
                        SELECT id, acuerdo_id, sucursal, tipo_espacio, ubicacion, detalle, orden
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

    def save_acuerdos_proveedor(self, payload):
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
                    if proveedor_id:
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
            SELECT sucursal, tipo_espacio, ubicacion, detalle, orden
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
                "detalle": item.get("detalle") or "",
                "orden": item.get("orden"),
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
            detalle = str((item or {}).get("detalle") or "").strip()
            if sucursal not in SUCURSALES:
                raise ValueError("Sucursal invalida en ubicaciones.")
            if tipo not in {"puntera", "pestana", "tramo_gondola", "isla", "espacio_gondola_frio"}:
                raise ValueError("Tipo de espacio invalido.")
            if not ubicacion:
                raise ValueError("La ubicacion es obligatoria.")
            clean_ubicaciones.append((sucursal, tipo, ubicacion, detalle, index))

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
                        if acuerdo_origen_id:
                            cur.execute(
                                """
                                UPDATE acuerdos_comerciales
                                SET estado_renovacion = 'renovado',
                                    renovado_por_acuerdo_id = %s,
                                    actualizado_en = NOW()
                                WHERE id = %s
                                """,
                                (acuerdo_id, acuerdo_origen_id),
                            )

                    cur.executemany(
                        """
                        INSERT INTO acuerdos_ubicaciones(acuerdo_id, sucursal, tipo_espacio, ubicacion, detalle, orden)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        [(acuerdo_id, *item) for item in clean_ubicaciones],
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
                    SELECT id, acuerdo_id, sucursal, tipo_espacio, ubicacion, detalle, orden
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
                    SELECT id, acuerdo_id, sucursal, tipo_espacio, ubicacion, detalle, orden
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

