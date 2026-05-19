"""Servicio de autenticacion y autorizacion."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import secrets
from typing import Any

from web.backend.auth.repositories.auth_repository import AuthRepository
from web.backend.auth.security.passwords import hash_password, verify_password


SESSION_TTL_DAYS = 7
MODULES = [
    {"key": "dashboard", "label": "Dashboard"},
    {"key": "compras-faena", "label": "Compras y faena"},
    {"key": "resumenes", "label": "Resumenes"},
    {"key": "recepcion", "label": "Recepcion"},
    {"key": "distribuciones", "label": "Distribuciones"},
    {"key": "flota", "label": "Flota"},
    {"key": "acuerdos-comerciales", "label": "Acuerdos comerciales"},
    {"key": "contratos", "label": "Contratos"},
    {"key": "archivos-directorio", "label": "Archivos de directorio"},
    {"key": "usuarios", "label": "Usuarios"},
]
MODULE_KEYS = {module["key"] for module in MODULES}
DEFAULT_MODULES_BY_ROLE = {
    "admin": [module["key"] for module in MODULES],
    "supervisor": [
        "dashboard",
        "compras-faena",
        "resumenes",
        "recepcion",
        "distribuciones",
        "flota",
        "acuerdos-comerciales",
        "contratos",
        "archivos-directorio",
    ],
    "recepcion": ["recepcion", "flota"],
}


class AuthError(Exception):
    pass


class PermissionDenied(AuthError):
    pass


class AuthService:
    def __init__(self, db_url: str):
        self.repo = AuthRepository(db_url)
        self.repo.ensure_schema()

    def login(self, username: str, password: str, ip: str | None = None, user_agent: str | None = None) -> tuple[dict[str, Any], str, int]:
        username = (username or "").strip()
        password = password or ""
        if not username or not password:
            raise AuthError("Usuario y password son obligatorios.")

        user = self.repo.get_user_by_username(username)
        if not user or not user.get("activo"):
            raise AuthError("Usuario o password incorrectos.")
        if not verify_password(password, str(user.get("password_hash") or "")):
            raise AuthError("Usuario o password incorrectos.")

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
        self.repo.create_session(int(user["id"]), token, expires_at, ip=ip, user_agent=user_agent)
        return self._public_user(user), token, int(timedelta(days=SESSION_TTL_DAYS).total_seconds())

    def get_current_user(self, token: str | None) -> dict[str, Any] | None:
        token = (token or "").strip()
        if not token:
            return None
        user = self.repo.get_user_from_session(token)
        if not user or not user.get("activo"):
            return None
        return self._public_user(user)

    def logout(self, token: str | None) -> bool:
        token = (token or "").strip()
        if not token:
            return False
        return self.repo.close_session(token)

    def require_roles(self, user: dict[str, Any] | None, allowed_roles: set[str]) -> dict[str, Any]:
        if not user:
            raise AuthError("Sesion requerida.")
        role = str(user.get("rol") or "")
        if role not in allowed_roles:
            raise PermissionDenied("No tienes permisos para esta operacion.")
        return user

    def list_admin_users(self) -> dict[str, Any]:
        return {
            "modules": MODULES,
            "roles": self.repo.list_roles(),
            "users": [self._public_admin_user(user) for user in self.repo.list_users()],
        }

    def create_admin_user(self, username: str, nombre: str, password: str, rol: str, activo: bool = True) -> dict[str, Any]:
        return self.create_admin_user_with_scope(username, nombre, password, rol, None, activo)

    def create_admin_user_with_scope(
        self,
        username: str,
        nombre: str,
        password: str,
        rol: str,
        sucursal_permitida: str | None,
        activo: bool = True,
        modulos_permitidos: list[str] | None = None,
    ) -> dict[str, Any]:
        username = (username or "").strip().lower()
        nombre = (nombre or "").strip()
        rol = (rol or "").strip().lower()
        if not username:
            raise AuthError("El username es obligatorio.")
        if not nombre:
            raise AuthError("El nombre es obligatorio.")
        if len(password or "") < 6:
            raise AuthError("La password debe tener al menos 6 caracteres.")
        sucursal_permitida = self._normalize_sucursal_scope(rol, sucursal_permitida)
        modulos_permitidos = self._normalize_modules(rol, modulos_permitidos)
        user = self.repo.create_user(username, nombre, hash_password(password), rol, bool(activo), sucursal_permitida, modulos_permitidos)
        return self._public_admin_user(user)

    def update_admin_user(self, user_id: int, nombre: str, rol: str, activo: bool) -> dict[str, Any]:
        return self.update_admin_user_with_scope(user_id, nombre, rol, activo, None)

    def update_admin_user_with_scope(
        self,
        user_id: int,
        nombre: str,
        rol: str,
        activo: bool,
        sucursal_permitida: str | None,
        modulos_permitidos: list[str] | None = None,
    ) -> dict[str, Any]:
        nombre = (nombre or "").strip()
        rol = (rol or "").strip().lower()
        if not nombre:
            raise AuthError("El nombre es obligatorio.")
        sucursal_permitida = self._normalize_sucursal_scope(rol, sucursal_permitida)
        modulos_permitidos = self._normalize_modules(rol, modulos_permitidos)
        user = self.repo.update_user(int(user_id), nombre, rol, bool(activo), sucursal_permitida, modulos_permitidos)
        return self._public_admin_user(user)

    def update_admin_password(self, user_id: int, password: str) -> None:
        if len(password or "") < 6:
            raise AuthError("La password debe tener al menos 6 caracteres.")
        self.repo.update_password(int(user_id), hash_password(password))

    def _public_user(self, user: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": user["id"],
            "username": user["username"],
            "nombre": user["nombre"],
            "rol": user["rol"],
            "activo": bool(user["activo"]),
            "ultimo_login": user.get("ultimo_login"),
            "sucursal_permitida": user.get("sucursal_permitida"),
            "modulos_permitidos": self._public_modules(user),
        }

    def _public_admin_user(self, user: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": user["id"],
            "username": user["username"],
            "nombre": user["nombre"],
            "rol": user["rol"],
            "activo": bool(user["activo"]),
            "ultimo_login": user.get("ultimo_login"),
            "creado_en": user.get("creado_en"),
            "sucursal_permitida": user.get("sucursal_permitida"),
            "modulos_permitidos": self._public_modules(user),
        }

    def _normalize_sucursal_scope(self, rol: str, sucursal_permitida: str | None) -> str | None:
        if rol in {"admin", "supervisor"}:
            return None
        value = (sucursal_permitida or "").strip().lower()
        if rol == "recepcion":
            if value not in {"aregua", "luque", "itaugua"}:
                raise AuthError("Recepcion requiere una sucursal valida.")
            return value
        return None

    def _normalize_modules(self, rol: str, modulos_permitidos: list[str] | None) -> list[str]:
        if not isinstance(modulos_permitidos, list):
            return list(DEFAULT_MODULES_BY_ROLE.get(rol, []))
        clean = []
        for item in modulos_permitidos:
            key = str(item or "").strip()
            if key in MODULE_KEYS and key not in clean:
                clean.append(key)
        if rol != "admin":
            clean = [key for key in clean if key != "usuarios"]
        return clean

    def _public_modules(self, user: dict[str, Any]) -> list[str]:
        modules = user.get("modulos_permitidos")
        if isinstance(modules, list):
            return self._normalize_modules(str(user.get("rol") or ""), modules)
        return list(DEFAULT_MODULES_BY_ROLE.get(str(user.get("rol") or ""), []))
