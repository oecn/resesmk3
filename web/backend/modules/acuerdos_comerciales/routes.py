from __future__ import annotations

from web.backend.config import DATABASE_URL
from web.backend.auth.services.auth_service import PermissionDenied
from web.backend.modules.acuerdos_comerciales.repository import AcuerdosComercialesRepository
from web.backend.modules.acuerdos_comerciales.schemas import ROLES_ACUERDOS
from web.backend.modules.acuerdos_comerciales.service import AcuerdosComercialesService
from web.backend.routing import RequestContext, Router


service = AcuerdosComercialesService(AcuerdosComercialesRepository(DATABASE_URL))


def register_routes(router: Router):
    router.get("/api/acuerdos-comerciales/proveedores", list_proveedores)
    router.get("/api/acuerdos-comerciales/mapa/ubicaciones", list_mapa_ubicaciones)
    router.get("/api/acuerdos-comerciales/historial", list_historial)
    router.get("/api/acuerdos-comerciales/historial-proveedor", list_historial_proveedor)
    router.get("/api/acuerdos-comerciales/estadisticas", get_estadisticas)
    router.get("/api/acuerdos-comerciales/cobranzas/anual", list_cobranzas_anual)
    router.get("/api/acuerdos-comerciales/cobranzas", list_cobranzas)
    router.get("/api/acuerdos-comerciales", list_acuerdos)
    router.post("/api/acuerdos-comerciales/proveedores", save_proveedor)
    router.post("/api/acuerdos-comerciales/mapa/ubicaciones/valor", save_mapa_ubicacion_valor)
    router.post("/api/acuerdos-comerciales/cobranzas", save_cobranza)
    router.post("/api/acuerdos-comerciales/ubicaciones/aregua/import", import_ubicaciones_aregua)
    router.post("/api/acuerdos-comerciales/eliminar", eliminar_acuerdo)
    router.post("/api/acuerdos-comerciales", save_acuerdo)
    router.delete("/api/acuerdos-comerciales", descartar_negociacion)


def list_proveedores(ctx: RequestContext):
    ctx.handler._require_roles(ROLES_ACUERDOS)
    return service.list_proveedores(search=ctx.query.get("search", [""])[0])


def list_mapa_ubicaciones(ctx: RequestContext):
    ctx.handler._require_roles(ROLES_ACUERDOS)
    return service.list_mapa_ubicaciones(sucursal=ctx.query.get("sucursal", ["aregua"])[0])


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


def list_cobranzas(ctx: RequestContext):
    ctx.handler._require_roles(ROLES_ACUERDOS)
    mes = ctx.query.get("mes", [None])[0]
    anho = ctx.query.get("anho", [None])[0]
    if not mes or not anho:
        raise ValueError("Mes y anho son obligatorios.")
    return service.list_cobranzas(mes=mes, anho=anho)


def list_cobranzas_anual(ctx: RequestContext):
    ctx.handler._require_roles(ROLES_ACUERDOS)
    anho = ctx.query.get("anho", [None])[0]
    if not anho:
        raise ValueError("Anho es obligatorio.")
    return service.list_cobranzas_anual(anho=anho)


def get_estadisticas(ctx: RequestContext):
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    modules = user.get("modulos_permitidos")
    if isinstance(modules, list) and "acuerdos-estadisticas" not in modules:
        raise PermissionDenied("No tienes permisos para ver estadisticas de acuerdos.")
    return service.get_estadisticas(
        mes=ctx.query.get("mes", [None])[0],
        anho=ctx.query.get("anho", [None])[0],
    )


def save_proveedor(ctx: RequestContext):
    payload = ctx.payload or {}
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    ctx.handler._send_json(
        service.save_proveedor(payload, cambiado_por=user.get("username")),
        status=201 if not payload.get("id") else 200,
    )


def save_mapa_ubicacion_valor(ctx: RequestContext):
    payload = ctx.payload or {}
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    modules = user.get("modulos_permitidos")
    if isinstance(modules, list) and "acuerdos-valores" not in modules:
        raise PermissionDenied("No tienes permisos para cambiar valores de ubicaciones.")
    ctx.handler._send_json(service.save_mapa_ubicacion_valor(payload, cambiado_por=user.get("username")), status=200)


def save_cobranza(ctx: RequestContext):
    payload = ctx.payload or {}
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    ctx.handler._send_json(service.save_cobranza(payload, cambiado_por=user.get("username")), status=200)


def save_acuerdo(ctx: RequestContext):
    payload = ctx.payload or {}
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    ctx.handler._send_json(
        service.save_acuerdo(payload, cambiado_por=user.get("username")),
        status=201 if not payload.get("id") else 200,
    )


def descartar_negociacion(ctx: RequestContext):
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    acuerdo_id = ctx.query.get("id", [None])[0] or ctx.query.get("acuerdo_id", [None])[0]
    if not acuerdo_id:
        raise ValueError("El acuerdo_id es obligatorio.")
    ctx.handler._send_json(service.descartar_negociacion(acuerdo_id, cambiado_por=user.get("username")), status=200)


def eliminar_acuerdo(ctx: RequestContext):
    payload = ctx.payload or {}
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    ctx.handler._send_json(service.eliminar_acuerdo(payload, cambiado_por=user.get("username")), status=200)


def import_ubicaciones_aregua(ctx: RequestContext):
    payload = ctx.payload or {}
    user = ctx.handler._require_roles(ROLES_ACUERDOS)
    ctx.handler._send_json(service.import_ubicaciones_aregua(payload, cambiado_por=user.get("username")), status=200)
