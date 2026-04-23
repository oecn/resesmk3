from __future__ import annotations

import argparse
from pathlib import Path
import sys

import psycopg2

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from web.backend.config import DATABASE_URL
from web.backend.auth.security.passwords import hash_password


DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_NAME = "Administrador"
DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_ADMIN_ROLE = "admin"


def load_sql() -> str:
    sql_path = Path(__file__).with_name("001_auth_schema.sql")
    return sql_path.read_text(encoding="utf-8")


def ensure_admin(cur, username: str, nombre: str, password: str, role_name: str) -> tuple[str, bool]:
    cur.execute("SELECT id FROM roles WHERE nombre = %s", (role_name,))
    role_row = cur.fetchone()
    if not role_row:
        raise ValueError(f"No existe el rol requerido: {role_name}")

    role_id = role_row[0]
    password_hash = hash_password(password)
    cur.execute("SELECT id FROM usuarios WHERE username = %s", (username,))
    existing = cur.fetchone()
    if existing:
        cur.execute(
            """
            UPDATE usuarios
            SET nombre = %s,
                password_hash = %s,
                rol_id = %s,
                activo = TRUE,
                actualizado_en = NOW()
            WHERE username = %s
            """,
            (nombre, password_hash, role_id, username),
        )
        return username, False

    cur.execute(
        """
        INSERT INTO usuarios (username, nombre, password_hash, rol_id, activo)
        VALUES (%s, %s, %s, %s, TRUE)
        """,
        (username, nombre, password_hash, role_id),
    )
    return username, True


def run_migration(
    db_url: str,
    admin_username: str,
    admin_name: str,
    admin_password: str,
    admin_role: str,
) -> tuple[list[str], str, bool]:
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(load_sql())
            username, created = ensure_admin(
                cur,
                username=admin_username,
                nombre=admin_name,
                password=admin_password,
                role_name=admin_role,
            )
            cur.execute("SELECT nombre FROM roles ORDER BY id")
            roles = [row[0] for row in cur.fetchall()]
        conn.commit()
    return roles, username, created


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Crea las tablas de auth y deja listo un usuario administrador inicial."
    )
    parser.add_argument("--db-url", default=DATABASE_URL, help="Cadena de conexion a PostgreSQL.")
    parser.add_argument("--admin-username", default=DEFAULT_ADMIN_USERNAME, help="Usuario admin inicial.")
    parser.add_argument("--admin-name", default=DEFAULT_ADMIN_NAME, help="Nombre visible del admin inicial.")
    parser.add_argument("--admin-password", default=DEFAULT_ADMIN_PASSWORD, help="Password inicial del admin.")
    parser.add_argument("--admin-role", default=DEFAULT_ADMIN_ROLE, help="Rol del usuario semilla.")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    roles, username, created = run_migration(
        db_url=args.db_url,
        admin_username=args.admin_username,
        admin_name=args.admin_name,
        admin_password=args.admin_password,
        admin_role=args.admin_role,
    )
    action = "creado" if created else "actualizado"
    print("Migracion auth aplicada correctamente.")
    print(f"Roles disponibles: {', '.join(roles)}")
    print(f"Usuario admin {action}: {username}")


if __name__ == "__main__":
    main()
