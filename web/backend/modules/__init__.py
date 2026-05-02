"""Autodiscovery de modulos funcionales del backend."""

from __future__ import annotations

import importlib
import pkgutil

from web.backend.routing import Route, Router


def discover_routes() -> tuple[Route, ...]:
    router = Router()
    for module_info in pkgutil.iter_modules(__path__, prefix=f"{__name__}."):
        if not module_info.ispkg:
            continue
        routes_module_name = f"{module_info.name}.routes"
        try:
            routes_module = importlib.import_module(routes_module_name)
        except ModuleNotFoundError as exc:
            if exc.name == routes_module_name:
                continue
            raise
        register_routes = getattr(routes_module, "register_routes", None)
        if callable(register_routes):
            register_routes(router)
    return router.routes
