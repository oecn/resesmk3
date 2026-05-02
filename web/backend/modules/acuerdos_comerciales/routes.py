from __future__ import annotations

from web.backend.config import DATABASE_URL
from web.backend.modules.acuerdos_comerciales.repository import AcuerdosComercialesRepository
from web.backend.modules.acuerdos_comerciales.schemas import ROLES_ACUERDOS
from web.backend.modules.acuerdos_comerciales.service import AcuerdosComercialesService
from web.backend.routing import RequestContext, Router


service = AcuerdosComercialesService(AcuerdosComercialesRepository(DATABASE_URL))


def register_routes(router: Router):
    router.get("/api/acuerdos-comerciales/proveedores", list_proveedores)
    router.get("/api/acuerdos-comerciales/historial", list_historial)
    router.get("/api/acuerdos-comerciales/historial-proveedor", list_historial_proveedor)
    router.get("/api/acuerdos-comerciales", list_acuerdos)
    router.post("/api/acuerdos-comerciales/proveedores", save_proveedor)
    router.post("/api/acuerdos-comerciales", save_acuerdo)


def list_proveedores(ctx: RequestContext):
    ctx.handler._require_roles(ROLES_ACUERDOS)
    return service.list_proveedores(search=ctx.query.get("search", [""])[0])


def list_historial(ctx: RequestContext):
    ctx.handler._require_roles(ROLES_ACUERDOS)
    acuerdo_id = ctx.query.get("acuerdo_id", [None])[0]
    if not acuerdo_id:
        raise ValueError("El acuerdo_id es obligatorio.")
    return service.list_historial(acuerdo_id)


def list_historial_proveedor(ctx: RequestContext):
    ctx.handler._require_roles(ROLES_ACUERDOS)
    proveedor_id = ctx.query.get("proveedor_id", [None])[0]
    if not proveedor_id:
        raise ValueError("El proveedor_id es obligatorio.")
    return service.list_historial_proveedor(proveedor_id)


def list_acuerdos(ctx: RequestContext):
    ctx.handler._require_roles(ROLES_ACUERDOS)
    return service.list_acuerdos(search=ctx.query.get("search", [""])[0])


def save_proveedor(ctx: RequestContext):
    payload = ctx.payload or {}
    ctx.handler._require_roles(ROLES_ACUERDOS)
    ctx.handler._send_json(
        service.save_proveedor(payload),
        status=201 if not payload.get("id") else 200,
    )


def save_acuerdo(ctx: RequestContext):
    payload = ctx.payload or {}
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    ctx.handler._send_json(
        service.save_acuerdo(payload, cambiado_por=user.get("username")),
        status=201 if not payload.get("id") else 200,
    )
