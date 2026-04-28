"""Acceso a datos para usuarios y sesiones."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import psycopg2
import psycopg2.extras
from psycopg2 import IntegrityError


class AuthRepository:
    def __init__(self, db_url: str):
        self.db_url = db_url

    def _connect(self):
        return psycopg2.connect(self.db_url, connect_timeout=5)

    def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        u.id,
                        u.username,
                        u.nombre,
                        u.password_hash,
                        u.activo,
                        u.ultimo_login,
                        u.sucursal_permitida,
                        r.nombre AS rol
                    FROM usuarios u
                    JOIN roles r ON r.id = u.rol_id
                    WHERE LOWER(u.username) = LOWER(%s)
                    LIMIT 1
                    """,
                    (username,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def get_user_from_session(self, token: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        u.id,
                        u.username,
                        u.nombre,
                        u.activo,
                        u.ultimo_login,
                        u.sucursal_permitida,
                        r.nombre AS rol,
                        s.id AS sesion_id,
                        s.expira_en
                    FROM sesiones s
                    JOIN usuarios u ON u.id = s.usuario_id
                    JOIN roles r ON r.id = u.rol_id
                    WHERE s.token = %s
                      AND s.cerrada_en IS NULL
                      AND s.expira_en > NOW()
                    LIMIT 1
                    """,
                    (token,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def create_session(self, user_id: int, token: str, expira_en: datetime, ip: str | None, user_agent: str | None) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                self._cleanup_expired_sessions(cur)
                cur.execute(
                    """
                    INSERT INTO sesiones (usuario_id, token, expira_en, ip, user_agent)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user_id, token, expira_en, ip, user_agent),
                )
                cur.execute(
                    """
                    UPDATE usuarios
                    SET ultimo_login = NOW(),
                        actualizado_en = NOW()
                    WHERE id = %s
                    """,
                    (user_id,),
                )
            conn.commit()

    def _cleanup_expired_sessions(self, cur, retention_days: int = 30) -> None:
        cur.execute(
            """
            DELETE FROM sesiones
            WHERE expira_en < NOW() - (%s::text || ' days')::interval
            """,
            (int(retention_days),),
        )

    def close_session(self, token: str) -> bool:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE sesiones
                    SET cerrada_en = NOW()
                    WHERE token = %s
                      AND cerrada_en IS NULL
                    """,
                    (token,),
                )
                updated = cur.rowcount > 0
            conn.commit()
        return updated

    def list_roles(self) -> list[str]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT nombre FROM roles ORDER BY id")
                return [row[0] for row in cur.fetchall()]

    def list_users(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        u.id,
                        u.username,
                        u.nombre,
                        u.activo,
                        u.ultimo_login,
                        u.creado_en,
                        u.sucursal_permitida,
                        r.nombre AS rol
                    FROM usuarios u
                    JOIN roles r ON r.id = u.rol_id
                    ORDER BY LOWER(u.username)
                    """
                )
                return [dict(row) for row in cur.fetchall()]

    def create_user(
        self,
        username: str,
        nombre: str,
        password_hash: str,
        role_name: str,
        activo: bool,
        sucursal_permitida: str | None,
    ) -> dict[str, Any]:
        try:
            with self._connect() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT id FROM roles WHERE nombre = %s", (role_name,))
                    role_row = cur.fetchone()
                    if not role_row:
                        raise ValueError("Rol invalido.")
                    cur.execute(
                        """
                        INSERT INTO usuarios (username, nombre, password_hash, rol_id, activo, sucursal_permitida)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (username, nombre, password_hash, role_row["id"], activo, sucursal_permitida),
                    )
                    user_id = cur.fetchone()["id"]
                conn.commit()
        except IntegrityError as exc:
            raise ValueError("El username ya existe.") from exc
        return self.get_user_by_id(user_id)

    def update_user(self, user_id: int, nombre: str, role_name: str, activo: bool, sucursal_permitida: str | None) -> dict[str, Any]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT id FROM roles WHERE nombre = %s", (role_name,))
                role_row = cur.fetchone()
                if not role_row:
                    raise ValueError("Rol invalido.")
                cur.execute(
                    """
                    UPDATE usuarios
                    SET nombre = %s,
                        rol_id = %s,
                        activo = %s,
                        sucursal_permitida = %s,
                        actualizado_en = NOW()
                    WHERE id = %s
                    """,
                    (nombre, role_row["id"], activo, sucursal_permitida, user_id),
                )
                if cur.rowcount <= 0:
                    raise ValueError("Usuario no encontrado.")
            conn.commit()
        return self.get_user_by_id(user_id)

    def update_password(self, user_id: int, password_hash: str) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE usuarios
                    SET password_hash = %s,
                        actualizado_en = NOW()
                    WHERE id = %s
                    """,
                    (password_hash, user_id),
                )
                if cur.rowcount <= 0:
                    raise ValueError("Usuario no encontrado.")
            conn.commit()

    def get_user_by_id(self, user_id: int) -> dict[str, Any]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        u.id,
                        u.username,
                        u.nombre,
                        u.activo,
                        u.ultimo_login,
                        u.creado_en,
                        u.sucursal_permitida,
                        r.nombre AS rol
                    FROM usuarios u
                    JOIN roles r ON r.id = u.rol_id
                    WHERE u.id = %s
                    LIMIT 1
                    """,
                    (user_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise ValueError("Usuario no encontrado.")
                return dict(row)
