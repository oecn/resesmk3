from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

import psycopg2
import psycopg2.extras


class ContratosRepository:
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
                    OR LOWER(COALESCE(contexto, '')) LIKE %s
                    OR LOWER(COALESCE(clausulas_importantes, '')) LIKE %s
                )
                """
            )
            like = f"%{term}%"
            params.extend([like, like, like, like])
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

        if not inicio_contrato:
            raise ValueError("El inicio de contrato es obligatorio.")
        if duracion_meses is not None and duracion_meses <= 0:
            raise ValueError("La duracion debe ser mayor a cero.")
        if not ofrece:
            raise ValueError("Indica quien ofrece el contrato.")
        if not contratante:
            raise ValueError("Indica el contratante.")

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
                            actualizado_en = NOW()
                        WHERE id = %s
                          AND activo IS TRUE
                        RETURNING *
                        """,
                        (inicio_contrato, duracion_meses, contexto, clausulas, monto, ofrece, contratante, int(contrato_id)),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO contratos(
                            inicio_contrato, duracion_meses, contexto, clausulas_importantes,
                            monto_contrato, ofrece_contrato, contratante
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING *
                        """,
                        (inicio_contrato, duracion_meses, contexto, clausulas, monto, ofrece, contratante),
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
