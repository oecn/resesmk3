# Backend Modules

Carpeta reservada para modulos nuevos del backend.

Estructura sugerida por modulo:

```text
modules/nombre_modulo/
  repository.py  # consultas SQL y persistencia
  service.py     # reglas de negocio
  routes.py      # handlers/endpoints HTTP
  schemas.py     # validacion y contratos de payload
```

Por ahora el backend principal sigue en `dashboard_api.py`. Los modulos nuevos pueden crearse aqui y luego integrarse gradualmente.
