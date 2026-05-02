# Backend Modules

Carpeta para modulos nuevos del backend.

`DashboardHandler` carga automaticamente las rutas declaradas en paquetes hijos de
`web.backend.modules`. Un modulo nuevo debe exponer `routes.py` con una funcion
`register_routes(router)`.

Estructura sugerida por modulo:

```text
modules/nombre_modulo/
  __init__.py
  repository.py  # consultas SQL y persistencia
  service.py     # reglas de negocio
  routes.py      # handlers/endpoints HTTP
  schemas.py     # validacion y contratos de payload
```

Ejemplo minimo:

```python
def register_routes(router):
    router.get("/api/nombre-modulo/items", list_items)
    router.post("/api/nombre-modulo/items", save_item)


def list_items(ctx):
    ctx.handler._require_roles({"admin", "supervisor"})
    return {"items": []}


def save_item(ctx):
    ctx.handler._require_roles({"admin"})
    payload = ctx.payload or {}
    ctx.handler._send_json({"item": payload}, status=201)
```

Contrato de handlers:

- `ctx.handler`: instancia de `DashboardHandler`, con helpers como `_send_json`,
  `_send_pdf`, `_require_roles`, `_get_current_user`.
- `ctx.parsed`: resultado de `urlparse(self.path)`.
- `ctx.query`: query string parseado con `parse_qs`.
- `ctx.payload`: body JSON para `POST` y `PUT`; `None` en `GET` y `DELETE`.

Si el handler retorna un valor distinto de `None`, el dispatcher lo envia como
JSON con status `200`. Para otro status o para PDF, el handler debe llamar a
`ctx.handler._send_json(...)` o `ctx.handler._send_pdf(...)` y retornar `None`.

El backend principal sigue en `dashboard_api.py`, pero los endpoints nuevos ya no
necesitan editar `do_GET`, `do_POST`, `do_PUT` ni `do_DELETE`: basta crear el
paquete dentro de `modules/` y registrar sus rutas.
