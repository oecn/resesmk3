from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class RequestContext:
    handler: Any
    parsed: Any
    query: dict[str, list[str]]
    payload: dict[str, Any] | None = None


RouteHandler = Callable[[RequestContext], Any]


@dataclass(frozen=True)
class Route:
    method: str
    path: str
    handler: RouteHandler
    name: str = ""

    def matches(self, method: str, path: str) -> bool:
        return self.method == method.upper() and self.path == path


class Router:
    def __init__(self):
        self._routes: list[Route] = []

    @property
    def routes(self) -> tuple[Route, ...]:
        return tuple(self._routes)

    def add(self, method: str, path: str, handler: RouteHandler, name: str = ""):
        self._routes.append(Route(method.upper(), path, handler, name=name))

    def get(self, path: str, handler: RouteHandler, name: str = ""):
        self.add("GET", path, handler, name=name)

    def post(self, path: str, handler: RouteHandler, name: str = ""):
        self.add("POST", path, handler, name=name)

    def put(self, path: str, handler: RouteHandler, name: str = ""):
        self.add("PUT", path, handler, name=name)

    def delete(self, path: str, handler: RouteHandler, name: str = ""):
        self.add("DELETE", path, handler, name=name)

    def match(self, method: str, path: str) -> Route | None:
        for route in self._routes:
            if route.matches(method, path):
                return route
        return None
