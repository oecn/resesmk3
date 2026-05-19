from __future__ import annotations

from web.backend.auth.services.auth_service import AuthError, PermissionDenied
from web.backend.config import DATABASE_URL
from web.backend.modules.contratos.repository import ContratosRepository
from web.backend.routing import RequestContext, Router


MODULE_KEY = "contratos"
repo = ContratosRepository(DATABASE_URL)


def register_routes(router: Router):
    router.get("/api/contratos", list_contratos)
    router.post("/api/contratos", save_contrato)
    router.delete("/api/contratos", delete_contrato)


def list_contratos(ctx: RequestContext):
    _require_module(ctx)
    return repo.list_contratos(search=ctx.query.get("search", [""])[0])


def save_contrato(ctx: RequestContext):
    _require_module(ctx)
    payload = ctx.payload or {}
    ctx.handler._send_json(repo.save_contrato(payload), status=201 if not payload.get("id") else 200)


def delete_contrato(ctx: RequestContext):
    _require_module(ctx)
    contrato_id = ctx.query.get("id", [None])[0]
    if not contrato_id:
        raise ValueError("Falta id de contrato.")
    return repo.delete_contrato(contrato_id)


def _require_module(ctx: RequestContext):
    user = ctx.handler._get_current_user()
    if not user:
        raise AuthError("Sesion requerida.")
    role = str(user.get("rol") or "")
    modules = user.get("modulos_permitidos")
    if isinstance(modules, list):
        if MODULE_KEY not in modules:
            raise PermissionDenied("No tienes permisos para este modulo.")
        return user
    if role in {"admin", "supervisor"}:
        return user
    raise PermissionDenied("No tienes permisos para este modulo.")
