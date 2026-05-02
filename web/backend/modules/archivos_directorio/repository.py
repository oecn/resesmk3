from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras


@dataclass(frozen=True)
class DirectoryFile:
    body: bytes
    filename: str
    content_type: str


class ArchivosDirectorioRepository:
    def __init__(self, root: str):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def list_directory(self, relative_path: str | None = None) -> dict[str, Any]:
        current = self._resolve(relative_path or "")
        if not current.exists() or not current.is_dir():
            raise ValueError("Directorio no encontrado.")

        directories = []
        files = []
        for entry in sorted(current.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower())):
            if entry.name.startswith("."):
                continue
            stat = entry.stat()
            item = {
                "name": entry.name,
                "path": self._relative(entry),
                "modified_at": stat.st_mtime,
            }
            if entry.is_dir():
                directories.append({**item, "type": "directory"})
            elif entry.is_file():
                files.append(
                    {
                        **item,
                        "type": "file",
                        "size": stat.st_size,
                        "extension": entry.suffix.lower().lstrip("."),
                    }
                )

        parent = None
        if current != self.root:
            parent = self._relative(current.parent)

        return {
            "root": str(self.root),
            "path": self._relative(current),
            "parent": parent,
            "directories": directories,
            "files": files,
        }

    def get_file_path(self, relative_path: str) -> Path:
        path = self._resolve(relative_path)
        if not path.exists() or not path.is_file():
            raise ValueError("Archivo no encontrado.")
        return path

    def _resolve(self, relative_path: str) -> Path:
        raw = str(relative_path or "").strip().replace("\\", "/")
        parts = [part for part in raw.split("/") if part and part not in {".", ".."}]
        path = (self.root.joinpath(*parts)).resolve()
        if path != self.root and self.root not in path.parents:
            raise ValueError("Ruta fuera del directorio permitido.")
        return path

    def _relative(self, path: Path) -> str:
        if path == self.root:
            return ""
        return path.relative_to(self.root).as_posix()


class ArchivosDirectorioTextRepository:
    LOCALES_PROPIEDAD = {"luque", "aregua", "itaugua", "limpio", "otro"}

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
        self._schema_ready = True

    def list_propiedades(self, search=None, local=None):
        filters = ["activo IS TRUE"]
        params: list[Any] = []
        local_value = str(local or "").strip().lower()
        if local_value:
            filters.append("local = %s")
            params.append(local_value)
        term = str(search or "").strip().lower()
        if term:
            filters.append(
                """
                (
                    LOWER(otorgado_por) LIKE %s
                    OR LOWER(a_favor_de) LIKE %s
                    OR LOWER(COALESCE(cuenta_catastral, '')) LIKE %s
                    OR LOWER(COALESCE(numero_finca, '')) LIKE %s
                    OR LOWER(COALESCE(descripcion_ubicacion, '')) LIKE %s
                    OR LOWER(COALESCE(local_otro, '')) LIKE %s
                )
                """
            )
            like = f"%{term}%"
            params.extend([like, like, like, like, like, like])
        where = f"WHERE {' AND '.join(filters)}"
        with self._connect(readonly=True) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT id,
                           local,
                           local_otro,
                           otorgado_por,
                           a_favor_de,
                           monto,
                           cuenta_catastral,
                           numero_finca,
                           bibliorato,
                           mes_anho,
                           descripcion_ubicacion,
                           observaciones,
                           creado_en,
                           actualizado_en
                    FROM archivos_propiedades
                    {where}
                    ORDER BY COALESCE(mes_anho, TO_CHAR(fecha, 'YYYY-MM'), TO_CHAR(creado_en, 'YYYY-MM')) DESC, id DESC
                    LIMIT 500
                    """,
                    params,
                )
                items = [dict(row) for row in cur.fetchall()]
                cur.execute(
                    """
                    SELECT DISTINCT bibliorato
                    FROM archivos_propiedades
                    WHERE activo IS TRUE
                      AND COALESCE(BTRIM(bibliorato), '') <> ''
                    ORDER BY bibliorato
                    """
                )
                biblioratos = [row["bibliorato"] for row in cur.fetchall()]
                return {"items": items, "locales": sorted(self.LOCALES_PROPIEDAD), "biblioratos": biblioratos}

    def save_propiedad(self, payload):
        propiedad_id = payload.get("id")
        local = str(payload.get("local") or "").strip().lower()
        local_otro = str(payload.get("local_otro") or "").strip()
        otorgado_por = str(payload.get("otorgado_por") or "").strip()
        a_favor_de = str(payload.get("a_favor_de") or "").strip()
        monto = self._parse_decimal(payload.get("monto"))
        cuenta_catastral = str(payload.get("cuenta_catastral") or "").strip()
        numero_finca = str(payload.get("numero_finca") or "").strip()
        bibliorato = str(payload.get("bibliorato") or "").strip()
        mes_anho = self._parse_month(payload.get("mes_anho") or payload.get("fecha"))
        descripcion_ubicacion = str(payload.get("descripcion_ubicacion") or "").strip()
        observaciones = str(payload.get("observaciones") or "").strip()

        if local not in self.LOCALES_PROPIEDAD:
            raise ValueError("Selecciona una ubicacion valida.")
        if local == "otro" and not local_otro:
            raise ValueError("Indica el nombre de la ubicacion adicional.")
        if not otorgado_por:
            raise ValueError("El campo otorgado por es obligatorio.")
        if not a_favor_de:
            raise ValueError("El campo a favor de es obligatorio.")
        if not cuenta_catastral and not numero_finca:
            raise ValueError("Carga al menos cuenta catastral o numero de finca.")

        with self._connect(readonly=False) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if propiedad_id:
                    cur.execute(
                        """
                        UPDATE archivos_propiedades
                        SET local = %s,
                            local_otro = %s,
                            otorgado_por = %s,
                            a_favor_de = %s,
                            monto = %s,
                            cuenta_catastral = %s,
                            numero_finca = %s,
                            bibliorato = %s,
                            mes_anho = %s,
                            descripcion_ubicacion = %s,
                            observaciones = %s,
                            actualizado_en = NOW()
                        WHERE id = %s
                          AND activo IS TRUE
                        RETURNING *
                        """,
                        (
                            local,
                            local_otro,
                            otorgado_por,
                            a_favor_de,
                            monto,
                            cuenta_catastral,
                            numero_finca,
                            bibliorato,
                            mes_anho,
                            descripcion_ubicacion,
                            observaciones,
                            int(propiedad_id),
                        ),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO archivos_propiedades(
                            local, local_otro, otorgado_por, a_favor_de, monto,
                            cuenta_catastral, numero_finca, bibliorato, mes_anho, descripcion_ubicacion, observaciones
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *
                        """,
                        (
                            local,
                            local_otro,
                            otorgado_por,
                            a_favor_de,
                            monto,
                            cuenta_catastral,
                            numero_finca,
                            bibliorato,
                            mes_anho,
                            descripcion_ubicacion,
                            observaciones,
                        ),
                    )
                row = cur.fetchone()
                if not row:
                    raise ValueError("Propiedad no encontrada.")
            conn.commit()
        return dict(row)

    def delete_propiedad(self, propiedad_id):
        with self._connect(readonly=False) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    UPDATE archivos_propiedades
                    SET activo = FALSE,
                        actualizado_en = NOW()
                    WHERE id = %s
                      AND activo IS TRUE
                    RETURNING id
                    """,
                    (int(propiedad_id),),
                )
                row = cur.fetchone()
                if not row:
                    raise ValueError("Propiedad no encontrada.")
            conn.commit()
        return {"ok": True}

    def _parse_month(self, value):
        if value in (None, ""):
            return None
        if isinstance(value, (datetime, date)):
            return value.strftime("%Y-%m")
        raw = str(value).strip()
        if len(raw) >= 7:
            raw = raw[:7]
        datetime.strptime(raw, "%Y-%m")
        return raw

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
        return Decimal(text)
