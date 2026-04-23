# Migraciones

Carpeta reservada para scripts SQL/Python de cambios de esquema.

Migracion disponible:

- `001_auth_schema.sql`: crea `roles`, `usuarios` y `sesiones`, mas indices y roles base.
- `001_auth_schema.py`: ejecuta la migracion SQL y deja listo un admin inicial.
- `002_usuario_sucursal.py`: agrega `sucursal_permitida` para restringir usuarios de recepcion.
- `003_flota_base.sql`: crea `vehiculos`, `proveedores_flota`, `tipos_gasto_flota`, `cargas_combustible` y `gastos_flota`.
- `003_flota_base.py`: ejecuta la migracion base del modulo de flota.
- `004_gastos_flota_proveedor_manual.py`: agrega `proveedor_nombre` y `proveedor_ruc` a gastos de flota.

Uso recomendado:

```bash
python dashboard/migrations/001_auth_schema.py
```

Opciones utiles:

```bash
python -m dashboard.migrations.001_auth_schema --admin-username admin --admin-name "Administrador" --admin-password "cambiar-esto"
```

Despues ejecuta:

```bash
python dashboard/migrations/002_usuario_sucursal.py
```

Luego, si vas a usar control de vehiculos y combustible:

```bash
python dashboard/migrations/003_flota_base.py
```

Si vas a cargar gastos ocasionales con proveedor manual:

```bash
python dashboard/migrations/004_gastos_flota_proveedor_manual.py
```
