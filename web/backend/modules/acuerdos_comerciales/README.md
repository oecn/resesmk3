# Acuerdos Comerciales

Modulo backend para acuerdos comerciales.

```text
repository.py  # SQL, schema propio y persistencia
service.py     # fachada de casos de uso del modulo
routes.py      # registro de endpoints HTTP
schemas.py     # constantes de contrato y validacion compartida
```

Las rutas se registran automaticamente desde `register_routes(router)`.
