# Migraciones

Carpeta reservada para scripts SQL/Python de cambios de esquema.

Migracion disponible:

- `001_auth_schema.sql`: crea `roles`, `usuarios` y `sesiones`, mas indices y roles base.
- `001_auth_schema.py`: ejecuta la migracion SQL y deja listo un admin inicial.
- `002_usuario_sucursal.py`: agrega `sucursal_permitida` para restringir usuarios de recepcion.
- `003_flota_base.sql`: crea `vehiculos`, `proveedores_flota`, `tipos_gasto_flota`, `cargas_combustible` y `gastos_flota`.
- `003_flota_base.py`: ejecuta la migracion base del modulo de flota.
- `004_gastos_flota_proveedor_manual.py`: agrega `proveedor_nombre` y `proveedor_ruc` a gastos de flota.
- `007_flota_facturas_unicas.py`: evita facturas duplicadas en combustible activo y gastos de flota.
- `008_sesiones_expiradas_cleanup.py`: agrega indice por expiracion y borra sesiones expiradas antiguas.
- `009_menudencias_unificadas.py`: crea `menudencias` con `sucursal` y copia las tres tablas legacy.

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

Para bloquear facturas duplicadas en flota:

```bash
python dashboard/migrations/007_flota_facturas_unicas.py
```

Para limpiar sesiones expiradas antiguas:

```bash
python dashboard/migrations/008_sesiones_expiradas_cleanup.py
```

Para unificar menudencias por sucursal:

```bash
python dashboard/migrations/009_menudencias_unificadas.py
```
