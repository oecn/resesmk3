from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

import psycopg2
import psycopg2.extras


class ContratosRepository:
    NATURALEZA_POR_CATEGORIA = {
        "alquiler": "Inmobiliaria / Legal",
        "publicidad_radial": "Comercial / Publicidad",
        "publicidad_television": "Comercial / Publicidad",
        "publicidad_redes": "Comercial / Publicidad",
        "publicidad_carteleria": "Comercial / Publicidad",
        "sponsoreo_deportivo": "Comercial / Publicidad",
        "servicios_personales": "Laboral / Servicio",
        "servicios_tercerizados": "Operativa / Servicio",
        "compra_terreno": "Inmobiliaria / Legal",
        "compra_vehiculo": "Patrimonial / Legal",
        "mades": "Medioambiental / Legal",
        "manipulacion_alimentos": "Sanitaria / Operativa",
        "certificado_alimentos": "Sanitaria / Operativa",
        "habilitacion_municipal": "Legal / Operativa",
        "autorizaciones": "Legal / Autorizacion",
        "general": "General",
    }

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
                    CREATE TABLE IF NOT EXISTS contratos (
                        id SERIAL PRIMARY KEY,
                        inicio_contrato DATE NOT NULL,
                        duracion_meses INTEGER NULL,
                        contexto TEXT NULL,
                        clausulas_importantes TEXT NULL,
                        monto_contrato NUMERIC(18, 2) NULL,
                        ofrece_contrato TEXT NOT NULL,
                        contratante TEXT NOT NULL,
                        activo BOOLEAN NOT NULL DEFAULT TRUE,
                        creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
                        actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
                    )
                    """
                )
                cur.execute("CREATE INDEX IF NOT EXISTS idx_contratos_activo_inicio ON contratos(activo, inicio_contrato DESC)")
                for column, definition in (
                    ("nombre_documento", "TEXT NULL"),
                    ("tipo_documento", "TEXT NOT NULL DEFAULT 'contrato'"),
                    ("categoria", "TEXT NOT NULL DEFAULT 'general'"),
                    ("naturaleza", "TEXT NULL"),
                    ("sucursal", "TEXT NULL"),
                    ("entidad_relacionada", "TEXT NULL"),
                    ("responsable_interno", "TEXT NULL"),
                    ("estado_documento", "TEXT NOT NULL DEFAULT 'vigente'"),
                    ("fecha_fin", "DATE NULL"),
                    ("archivo_url", "TEXT NULL"),
                    ("bibliorato", "TEXT NULL"),
                    ("localidad", "TEXT NULL"),
                    ("cuenta_catastral", "TEXT NULL"),
                    ("finca_matricula", "TEXT NULL"),
                    ("superficie", "TEXT NULL"),
                    ("distrito", "TEXT NULL"),
                    ("departamento", "TEXT NULL"),
                    ("marca", "TEXT NULL"),
                    ("modelo", "TEXT NULL"),
                    ("anho_vehiculo", "TEXT NULL"),
                    ("chapa", "TEXT NULL"),
                    ("chasis", "TEXT NULL"),
                    ("motor", "TEXT NULL"),
                    ("estado_transferencia", "TEXT NULL"),
                    ("medio_publicidad", "TEXT NULL"),
                    ("programa_publicidad", "TEXT NULL"),
                    ("horario_publicidad", "TEXT NULL"),
                    ("frecuencia_publicidad", "TEXT NULL"),
                    ("club_equipo", "TEXT NULL"),
                    ("ubicacion_marca", "TEXT NULL"),
                    ("beneficios_pactados", "TEXT NULL"),
                    ("entidad_emisora", "TEXT NULL"),
                    ("numero_documento", "TEXT NULL"),
                ):
                    cur.execute(f"ALTER TABLE contratos ADD COLUMN IF NOT EXISTS {column} {definition}")
            conn.commit()
        self._schema_ready = True

    def list_contratos(self, search=None):
        filters = ["activo IS TRUE"]
        params: list[Any] = []
        term = str(search or "").strip().lower()
        if term:
            filters.append(
                """
                (
                    LOWER(ofrece_contrato) LIKE %s
                    OR LOWER(contratante) LIKE %s
                    OR LOWER(COALESCE(nombre_documento, '')) LIKE %s
                    OR LOWER(COALESCE(categoria, '')) LIKE %s
                    OR LOWER(COALESCE(naturaleza, '')) LIKE %s
                    OR LOWER(COALESCE(sucursal, '')) LIKE %s
                    OR LOWER(COALESCE(contexto, '')) LIKE %s
                    OR LOWER(COALESCE(clausulas_importantes, '')) LIKE %s
                )
                """
            )
            like = f"%{term}%"
            params.extend([like, like, like, like, like, like, like, like])
        where = f"WHERE {' AND '.join(filters)}"
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT id,
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
                           entidad_relacionada,
                           responsable_interno,
                           estado_documento,
                           fecha_fin,
                           archivo_url,
                           bibliorato,
                           localidad,
                           cuenta_catastral,
                           finca_matricula,
                           superficie,
                           distrito,
                           departamento,
                           marca,
                           modelo,
                           anho_vehiculo,
                           chapa,
                           chasis,
                           motor,
                           estado_transferencia,
                           medio_publicidad,
                           programa_publicidad,
                           horario_publicidad,
                           frecuencia_publicidad,
                           club_equipo,
                           ubicacion_marca,
                           beneficios_pactados,
                           entidad_emisora,
                           numero_documento,
                           creado_en,
                           actualizado_en
                    FROM contratos
                    {where}
                    ORDER BY inicio_contrato DESC, id DESC
                    LIMIT 500
                    """,
                    params,
                )
                return {"items": [dict(row) for row in cur.fetchall()]}

    def save_contrato(self, payload):
        contrato_id = payload.get("id")
        inicio_contrato = self._parse_date(payload.get("inicio_contrato"))
        duracion_meses = self._parse_int(payload.get("duracion_meses"), allow_empty=True)
        contexto = str(payload.get("contexto") or "").strip()
        clausulas = str(payload.get("clausulas_importantes") or "").strip()
        monto = self._parse_decimal(payload.get("monto_contrato"))
        ofrece = str(payload.get("ofrece_contrato") or "").strip()
        contratante = str(payload.get("contratante") or "").strip()
        nombre_documento = str(payload.get("nombre_documento") or "").strip()
        tipo_documento = str(payload.get("tipo_documento") or "contrato").strip().lower()
        categoria = str(payload.get("categoria") or "general").strip().lower()
        naturaleza = self.NATURALEZA_POR_CATEGORIA.get(categoria, "General")
        sucursal = str(payload.get("sucursal") or "").strip()
        entidad_relacionada = str(payload.get("entidad_relacionada") or "").strip()
        responsable_interno = str(payload.get("responsable_interno") or "").strip()
        estado_documento = str(payload.get("estado_documento") or "vigente").strip().lower()
        fecha_fin = self._parse_date(payload.get("fecha_fin"))
        archivo_url = str(payload.get("archivo_url") or "").strip()
        bibliorato = str(payload.get("bibliorato") or "").strip()
        localidad = str(payload.get("localidad") or "").strip()
        cuenta_catastral = str(payload.get("cuenta_catastral") or "").strip()
        finca_matricula = str(payload.get("finca_matricula") or "").strip()
        superficie = str(payload.get("superficie") or "").strip()
        distrito = str(payload.get("distrito") or "").strip()
        departamento = str(payload.get("departamento") or "").strip()
        marca = str(payload.get("marca") or "").strip()
        modelo = str(payload.get("modelo") or "").strip()
        anho_vehiculo = str(payload.get("anho_vehiculo") or "").strip()
        chapa = str(payload.get("chapa") or "").strip()
        chasis = str(payload.get("chasis") or "").strip()
        motor = str(payload.get("motor") or "").strip()
        estado_transferencia = str(payload.get("estado_transferencia") or "").strip()
        medio_publicidad = str(payload.get("medio_publicidad") or "").strip()
        programa_publicidad = str(payload.get("programa_publicidad") or "").strip()
        horario_publicidad = str(payload.get("horario_publicidad") or "").strip()
        frecuencia_publicidad = str(payload.get("frecuencia_publicidad") or "").strip()
        club_equipo = str(payload.get("club_equipo") or "").strip()
        ubicacion_marca = str(payload.get("ubicacion_marca") or "").strip()
        beneficios_pactados = str(payload.get("beneficios_pactados") or "").strip()
        entidad_emisora = str(payload.get("entidad_emisora") or "").strip()
        numero_documento = str(payload.get("numero_documento") or "").strip()

        if not inicio_contrato:
            raise ValueError("El inicio de contrato es obligatorio.")
        if duracion_meses is not None and duracion_meses <= 0:
            raise ValueError("La duracion debe ser mayor a cero.")
        if not ofrece:
            raise ValueError("Indica quien ofrece el contrato.")
        if not contratante:
            raise ValueError("Indica el contratante.")
        if tipo_documento not in {"contrato", "permiso", "certificado", "habilitacion", "documento_legal"}:
            raise ValueError("Tipo de documento invalido.")
        if estado_documento not in {"vigente", "por_vencer", "vencido", "en_renovacion", "cancelado", "no_renovable", "finalizado"}:
            raise ValueError("Estado de documento invalido.")

        with self._connect(readonly=False) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if contrato_id:
                    cur.execute(
                        """
                        UPDATE contratos
                        SET inicio_contrato = %s,
                            duracion_meses = %s,
                            contexto = %s,
                            clausulas_importantes = %s,
                            monto_contrato = %s,
                            ofrece_contrato = %s,
                            contratante = %s,
                            nombre_documento = %s,
                            tipo_documento = %s,
                            categoria = %s,
                            naturaleza = %s,
                            sucursal = %s,
                            entidad_relacionada = %s,
                            responsable_interno = %s,
                            estado_documento = %s,
                            fecha_fin = %s,
                            archivo_url = %s,
                            bibliorato = %s,
                            localidad = %s,
                            cuenta_catastral = %s,
                            finca_matricula = %s,
                            superficie = %s,
                            distrito = %s,
                            departamento = %s,
                            marca = %s,
                            modelo = %s,
                            anho_vehiculo = %s,
                            chapa = %s,
                            chasis = %s,
                            motor = %s,
                            estado_transferencia = %s,
                            medio_publicidad = %s,
                            programa_publicidad = %s,
                            horario_publicidad = %s,
                            frecuencia_publicidad = %s,
                            club_equipo = %s,
                            ubicacion_marca = %s,
                            beneficios_pactados = %s,
                            entidad_emisora = %s,
                            numero_documento = %s,
                            actualizado_en = NOW()
                        WHERE id = %s
                          AND activo IS TRUE
                        RETURNING *
                        """,
                        (
                            inicio_contrato, duracion_meses, contexto, clausulas, monto, ofrece, contratante,
                            nombre_documento, tipo_documento, categoria, naturaleza, sucursal, entidad_relacionada,
                            responsable_interno, estado_documento, fecha_fin, archivo_url, bibliorato, localidad, cuenta_catastral,
                            finca_matricula, superficie, distrito, departamento, marca, modelo, anho_vehiculo, chapa,
                            chasis, motor, estado_transferencia, medio_publicidad, programa_publicidad, horario_publicidad,
                            frecuencia_publicidad, club_equipo, ubicacion_marca,
                            beneficios_pactados, entidad_emisora, numero_documento, int(contrato_id),
                        ),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO contratos(
                            inicio_contrato, duracion_meses, contexto, clausulas_importantes,
                            monto_contrato, ofrece_contrato, contratante,
                            nombre_documento, tipo_documento, categoria, naturaleza, sucursal,
                            entidad_relacionada, responsable_interno, estado_documento, fecha_fin, archivo_url, bibliorato,
                            localidad, cuenta_catastral, finca_matricula, superficie, distrito, departamento,
                            marca, modelo, anho_vehiculo, chapa, chasis, motor, estado_transferencia,
                            medio_publicidad, programa_publicidad, horario_publicidad, frecuencia_publicidad,
                            club_equipo, ubicacion_marca, beneficios_pactados,
                            entidad_emisora, numero_documento
                        )
                        VALUES (
                            %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s
                        )
                        RETURNING *
                        """,
                        (
                            inicio_contrato, duracion_meses, contexto, clausulas, monto, ofrece, contratante,
                            nombre_documento, tipo_documento, categoria, naturaleza, sucursal, entidad_relacionada,
                            responsable_interno, estado_documento, fecha_fin, archivo_url, bibliorato, localidad, cuenta_catastral,
                            finca_matricula, superficie, distrito, departamento, marca, modelo, anho_vehiculo, chapa,
                            chasis, motor, estado_transferencia, medio_publicidad, programa_publicidad, horario_publicidad,
                            frecuencia_publicidad, club_equipo, ubicacion_marca,
                            beneficios_pactados, entidad_emisora, numero_documento,
                        ),
                    )
                row = cur.fetchone()
                if not row:
                    raise ValueError("Contrato no encontrado.")
            conn.commit()
        return dict(row)

    def delete_contrato(self, contrato_id):
        with self._connect(readonly=False) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    UPDATE contratos
                    SET activo = FALSE,
                        actualizado_en = NOW()
                    WHERE id = %s
                      AND activo IS TRUE
                    RETURNING id
                    """,
                    (int(contrato_id),),
                )
                if not cur.fetchone():
                    raise ValueError("Contrato no encontrado.")
            conn.commit()
        return {"ok": True}

    def _parse_date(self, value):
        if value in (None, ""):
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()

    def _parse_int(self, value, allow_empty=False):
        if value in (None, ""):
            return None if allow_empty else 0
        return int(str(value).strip())

    def _parse_decimal(self, value):
        if value in (None, ""):
            return None
        text = str(value).strip()
        if "," in text and "." in text:
            if text.rfind(",") > text.rfind("."):
                text = text.replace(".", "").replace(",", ".")
            else:
                text = text.replace(",", "")
        elif "," in text:
            text = text.replace(".", "").replace(",", ".")
        elif text.count(".") > 1:
            text = text.replace(".", "")
        amount = Decimal(text)
        if amount < 0:
            raise ValueError("El monto no puede ser negativo.")
        return amount
