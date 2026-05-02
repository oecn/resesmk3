from __future__ import annotations

import mimetypes
from urllib.parse import quote

from web.backend.auth.services.auth_service import AuthError, PermissionDenied
from web.backend.config import ARCHIVOS_DIRECTORIO_ROOT, DATABASE_URL
from web.backend.modules.archivos_directorio.repository import ArchivosDirectorioRepository, ArchivosDirectorioTextRepository
from web.backend.routing import RequestContext, Router


MODULE_KEY = "archivos-directorio"
repo = ArchivosDirectorioRepository(ARCHIVOS_DIRECTORIO_ROOT)
text_repo = ArchivosDirectorioTextRepository(DATABASE_URL)


def register_routes(router: Router):
    router.get("/api/archivos-directorio", list_directory)
    router.get("/api/archivos-directorio/download", download_file)
    router.get("/api/archivos-directorio/propiedades", list_propiedades)
    router.post("/api/archivos-directorio/propiedades", save_propiedad)
    router.delete("/api/archivos-directorio/propiedades", delete_propiedad)


def list_directory(ctx: RequestContext):
    _require_module(ctx)
    return repo.list_directory(ctx.query.get("path", [""])[0])


def download_file(ctx: RequestContext):
    _require_module(ctx)
    file_path = repo.get_file_path(ctx.query.get("path", [""])[0])
    body = file_path.read_bytes()
    filename = file_path.name
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    ctx.handler.send_response(200)
    ctx.handler._headers()
    ctx.handler.send_header("Content-Type", content_type)
    ctx.handler.send_header("Content-Disposition", f'attachment; filename="{quote(filename)}"')
    ctx.handler.send_header("Content-Length", str(len(body)))
    ctx.handler.end_headers()
    ctx.handler.wfile.write(body)


def list_propiedades(ctx: RequestContext):
    _require_module(ctx)
    return text_repo.list_propiedades(
        search=ctx.query.get("search", [""])[0],
        local=ctx.query.get("local", [""])[0],
    )


def save_propiedad(ctx: RequestContext):
    _require_module(ctx)
    payload = ctx.payload or {}
    result = text_repo.save_propiedad(payload)
    ctx.handler._send_json(result, status=201 if not payload.get("id") else 200)


def delete_propiedad(ctx: RequestContext):
    _require_module(ctx)
    propiedad_id = ctx.query.get("id", [None])[0]
    if not propiedad_id:
        raise ValueError("Falta id de propiedad.")
    return text_repo.delete_propiedad(propiedad_id)


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
