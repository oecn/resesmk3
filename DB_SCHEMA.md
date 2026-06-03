# Esquema de base de datos

Base configurada: `192.168.10.13:5432/reces`.

Tablas detectadas: `25`.

## `acuerdos_comerciales`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('acuerdos_comerciales_id_seq'::regclass)` |
| `proveedor_id` | `integer` | `NO` | `` |
| `titulo` | `text` | `NO` | `` |
| `retorno_porcentaje` | `numeric(8,3)` | `NO` | `0` |
| `vigencia_desde` | `date` | `YES` | `` |
| `vigencia_hasta` | `date` | `YES` | `` |
| `observaciones` | `text` | `YES` | `` |
| `activo` | `boolean` | `NO` | `true` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `actualizado_en` | `timestamp without time zone` | `NO` | `now()` |
| `duracion_meses` | `integer` | `YES` | `` |
| `estado_renovacion` | `text` | `NO` | `'vigente'::text` |
| `acuerdo_origen_id` | `integer` | `YES` | `` |
| `renovado_por_acuerdo_id` | `integer` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_32987_10_not_null` | `CHECK` | `` |  |
| `2200_32987_12_not_null` | `CHECK` | `` |  |
| `2200_32987_1_not_null` | `CHECK` | `` |  |
| `2200_32987_2_not_null` | `CHECK` | `` |  |
| `2200_32987_3_not_null` | `CHECK` | `` |  |
| `2200_32987_4_not_null` | `CHECK` | `` |  |
| `2200_32987_8_not_null` | `CHECK` | `` |  |
| `2200_32987_9_not_null` | `CHECK` | `` |  |
| `acuerdos_comerciales_proveedor_id_fkey` | `FOREIGN KEY` | `proveedor_id` | `acuerdos_proveedores.id` |
| `fk_acuerdos_comerciales_acuerdo_origen` | `FOREIGN KEY` | `acuerdo_origen_id` | `acuerdos_comerciales.id` |
| `fk_acuerdos_comerciales_renovado_por` | `FOREIGN KEY` | `renovado_por_acuerdo_id` | `acuerdos_comerciales.id` |
| `acuerdos_comerciales_pkey` | `PRIMARY KEY` | `id` |  |

## `acuerdos_facturas`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('acuerdos_facturas_id_seq'::regclass)` |
| `acuerdo_id` | `integer` | `NO` | `` |
| `periodo_anho` | `integer` | `NO` | `` |
| `periodo_mes` | `integer` | `NO` | `` |
| `numero_factura` | `text` | `NO` | `` |
| `monto_factura` | `numeric(14,2)` | `NO` | `0` |
| `fecha_factura` | `date` | `YES` | `` |
| `cobrado` | `boolean` | `NO` | `false` |
| `fecha_cobro` | `date` | `YES` | `` |
| `observaciones` | `text` | `YES` | `` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `actualizado_en` | `timestamp without time zone` | `NO` | `now()` |
| `forma_cobro` | `text` | `YES` | `` |
| `tipo_facturacion` | `text` | `NO` | `'ambos'::text` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_33222_11_not_null` | `CHECK` | `` |  |
| `2200_33222_12_not_null` | `CHECK` | `` |  |
| `2200_33222_14_not_null` | `CHECK` | `` |  |
| `2200_33222_1_not_null` | `CHECK` | `` |  |
| `2200_33222_2_not_null` | `CHECK` | `` |  |
| `2200_33222_3_not_null` | `CHECK` | `` |  |
| `2200_33222_4_not_null` | `CHECK` | `` |  |
| `2200_33222_5_not_null` | `CHECK` | `` |  |
| `2200_33222_6_not_null` | `CHECK` | `` |  |
| `2200_33222_8_not_null` | `CHECK` | `` |  |
| `chk_acuerdos_facturas_periodo_mes` | `CHECK` | `` |  |
| `chk_acuerdos_facturas_tipo` | `CHECK` | `` |  |
| `acuerdos_facturas_acuerdo_id_fkey` | `FOREIGN KEY` | `acuerdo_id` | `acuerdos_comerciales.id` |
| `acuerdos_facturas_pkey` | `PRIMARY KEY` | `id` |  |

## `acuerdos_historial`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('acuerdos_historial_id_seq'::regclass)` |
| `acuerdo_id` | `integer` | `NO` | `` |
| `accion` | `text` | `NO` | `` |
| `usuario` | `text` | `YES` | `` |
| `cambios` | `jsonb` | `NO` | `'[]'::jsonb` |
| `anterior` | `jsonb` | `YES` | `` |
| `nuevo` | `jsonb` | `YES` | `` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_33057_1_not_null` | `CHECK` | `` |  |
| `2200_33057_2_not_null` | `CHECK` | `` |  |
| `2200_33057_3_not_null` | `CHECK` | `` |  |
| `2200_33057_5_not_null` | `CHECK` | `` |  |
| `2200_33057_8_not_null` | `CHECK` | `` |  |
| `acuerdos_historial_acuerdo_id_fkey` | `FOREIGN KEY` | `acuerdo_id` | `acuerdos_comerciales.id` |
| `acuerdos_historial_pkey` | `PRIMARY KEY` | `id` |  |

## `acuerdos_mapa_ubicaciones`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('acuerdos_mapa_ubicaciones_id_seq'::regclass)` |
| `sucursal` | `text` | `NO` | `` |
| `codigo` | `text` | `NO` | `` |
| `bloque` | `text` | `NO` | `` |
| `numero` | `integer` | `NO` | `` |
| `tipo_espacio` | `text` | `NO` | `` |
| `valor_gs` | `numeric(14,2)` | `YES` | `` |
| `activo` | `boolean` | `NO` | `true` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `actualizado_en` | `timestamp without time zone` | `NO` | `now()` |
| `detalle` | `text` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_33517_10_not_null` | `CHECK` | `` |  |
| `2200_33517_1_not_null` | `CHECK` | `` |  |
| `2200_33517_2_not_null` | `CHECK` | `` |  |
| `2200_33517_3_not_null` | `CHECK` | `` |  |
| `2200_33517_4_not_null` | `CHECK` | `` |  |
| `2200_33517_5_not_null` | `CHECK` | `` |  |
| `2200_33517_6_not_null` | `CHECK` | `` |  |
| `2200_33517_8_not_null` | `CHECK` | `` |  |
| `2200_33517_9_not_null` | `CHECK` | `` |  |
| `acuerdos_mapa_ubicaciones_pkey` | `PRIMARY KEY` | `id` |  |
| `uq_acuerdos_mapa_ubicaciones_codigo` | `UNIQUE` | `sucursal` |  |
| `uq_acuerdos_mapa_ubicaciones_codigo` | `UNIQUE` | `sucursal` |  |
| `uq_acuerdos_mapa_ubicaciones_codigo` | `UNIQUE` | `codigo` |  |
| `uq_acuerdos_mapa_ubicaciones_codigo` | `UNIQUE` | `codigo` |  |

## `acuerdos_proveedores`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('acuerdos_proveedores_id_seq'::regclass)` |
| `nombre` | `text` | `NO` | `` |
| `ruc` | `text` | `YES` | `` |
| `telefono` | `text` | `YES` | `` |
| `email` | `text` | `YES` | `` |
| `activo` | `boolean` | `NO` | `true` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `actualizado_en` | `timestamp without time zone` | `NO` | `now()` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_32972_1_not_null` | `CHECK` | `` |  |
| `2200_32972_2_not_null` | `CHECK` | `` |  |
| `2200_32972_6_not_null` | `CHECK` | `` |  |
| `2200_32972_7_not_null` | `CHECK` | `` |  |
| `2200_32972_8_not_null` | `CHECK` | `` |  |
| `acuerdos_proveedores_pkey` | `PRIMARY KEY` | `id` |  |

## `acuerdos_ubicaciones`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('acuerdos_ubicaciones_id_seq'::regclass)` |
| `acuerdo_id` | `integer` | `NO` | `` |
| `sucursal` | `text` | `NO` | `` |
| `tipo_espacio` | `text` | `NO` | `` |
| `ubicacion` | `text` | `NO` | `` |
| `detalle` | `text` | `YES` | `` |
| `orden` | `integer` | `NO` | `1` |
| `codigo` | `text` | `YES` | `` |
| `bloque` | `text` | `YES` | `` |
| `numero` | `integer` | `YES` | `` |
| `valor_gs` | `numeric(14,2)` | `YES` | `` |
| `tentativa` | `boolean` | `NO` | `false` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_33008_12_not_null` | `CHECK` | `` |  |
| `2200_33008_1_not_null` | `CHECK` | `` |  |
| `2200_33008_2_not_null` | `CHECK` | `` |  |
| `2200_33008_3_not_null` | `CHECK` | `` |  |
| `2200_33008_4_not_null` | `CHECK` | `` |  |
| `2200_33008_5_not_null` | `CHECK` | `` |  |
| `2200_33008_7_not_null` | `CHECK` | `` |  |
| `acuerdos_ubicaciones_acuerdo_id_fkey` | `FOREIGN KEY` | `acuerdo_id` | `acuerdos_comerciales.id` |
| `acuerdos_ubicaciones_pkey` | `PRIMARY KEY` | `id` |  |

## `archivos_propiedades`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('archivos_propiedades_id_seq'::regclass)` |
| `local` | `text` | `NO` | `` |
| `local_otro` | `text` | `YES` | `` |
| `otorgado_por` | `text` | `NO` | `` |
| `a_favor_de` | `text` | `NO` | `` |
| `monto` | `numeric(18,2)` | `YES` | `` |
| `cuenta_catastral` | `text` | `YES` | `` |
| `numero_finca` | `text` | `YES` | `` |
| `fecha` | `date` | `YES` | `` |
| `descripcion_ubicacion` | `text` | `YES` | `` |
| `observaciones` | `text` | `YES` | `` |
| `activo` | `boolean` | `NO` | `true` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `actualizado_en` | `timestamp without time zone` | `NO` | `now()` |
| `bibliorato` | `text` | `YES` | `` |
| `mes_anho` | `text` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_33086_12_not_null` | `CHECK` | `` |  |
| `2200_33086_13_not_null` | `CHECK` | `` |  |
| `2200_33086_14_not_null` | `CHECK` | `` |  |
| `2200_33086_1_not_null` | `CHECK` | `` |  |
| `2200_33086_2_not_null` | `CHECK` | `` |  |
| `2200_33086_4_not_null` | `CHECK` | `` |  |
| `2200_33086_5_not_null` | `CHECK` | `` |  |
| `archivos_propiedades_pkey` | `PRIMARY KEY` | `id` |  |

## `cargas_combustible`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('cargas_combustible_id_seq'::regclass)` |
| `vehiculo_id` | `integer` | `NO` | `` |
| `fecha` | `date` | `NO` | `` |
| `proveedor_id` | `integer` | `YES` | `` |
| `litros` | `numeric(12,2)` | `NO` | `` |
| `importe` | `numeric(14,2)` | `NO` | `` |
| `precio_litro` | `numeric(12,2)` | `NO` | `` |
| `km_actual` | `numeric(12,2)` | `YES` | `` |
| `nro_factura` | `text` | `YES` | `` |
| `observacion` | `text` | `YES` | `` |
| `semana` | `integer` | `NO` | `` |
| `anho` | `integer` | `NO` | `` |
| `cargado_por` | `text` | `YES` | `` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `tipo_combustible` | `text` | `YES` | `` |
| `eliminado_en` | `timestamp without time zone` | `YES` | `` |
| `eliminado_por` | `text` | `YES` | `` |
| `motivo_eliminacion` | `text` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_24711_11_not_null` | `CHECK` | `` |  |
| `2200_24711_12_not_null` | `CHECK` | `` |  |
| `2200_24711_14_not_null` | `CHECK` | `` |  |
| `2200_24711_1_not_null` | `CHECK` | `` |  |
| `2200_24711_2_not_null` | `CHECK` | `` |  |
| `2200_24711_3_not_null` | `CHECK` | `` |  |
| `2200_24711_5_not_null` | `CHECK` | `` |  |
| `2200_24711_6_not_null` | `CHECK` | `` |  |
| `2200_24711_7_not_null` | `CHECK` | `` |  |
| `cargas_combustible_importe_check` | `CHECK` | `` |  |
| `cargas_combustible_litros_check` | `CHECK` | `` |  |
| `cargas_combustible_precio_litro_check` | `CHECK` | `` |  |
| `cargas_combustible_proveedor_id_fkey` | `FOREIGN KEY` | `proveedor_id` | `proveedores_flota.id` |
| `cargas_combustible_vehiculo_id_fkey` | `FOREIGN KEY` | `vehiculo_id` | `vehiculos.id` |
| `cargas_combustible_pkey` | `PRIMARY KEY` | `id` |  |

## `contratos`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('contratos_id_seq'::regclass)` |
| `inicio_contrato` | `date` | `NO` | `` |
| `duracion_meses` | `integer` | `YES` | `` |
| `contexto` | `text` | `YES` | `` |
| `clausulas_importantes` | `text` | `YES` | `` |
| `monto_contrato` | `numeric(18,2)` | `YES` | `` |
| `ofrece_contrato` | `text` | `NO` | `` |
| `contratante` | `text` | `NO` | `` |
| `activo` | `boolean` | `NO` | `true` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `actualizado_en` | `timestamp without time zone` | `NO` | `now()` |
| `nombre_documento` | `text` | `YES` | `` |
| `tipo_documento` | `text` | `NO` | `'contrato'::text` |
| `categoria` | `text` | `NO` | `'general'::text` |
| `naturaleza` | `text` | `YES` | `` |
| `sucursal` | `text` | `YES` | `` |
| `entidad_relacionada` | `text` | `YES` | `` |
| `responsable_interno` | `text` | `YES` | `` |
| `estado_documento` | `text` | `NO` | `'vigente'::text` |
| `fecha_fin` | `date` | `YES` | `` |
| `archivo_url` | `text` | `YES` | `` |
| `localidad` | `text` | `YES` | `` |
| `cuenta_catastral` | `text` | `YES` | `` |
| `finca_matricula` | `text` | `YES` | `` |
| `superficie` | `text` | `YES` | `` |
| `distrito` | `text` | `YES` | `` |
| `departamento` | `text` | `YES` | `` |
| `marca` | `text` | `YES` | `` |
| `modelo` | `text` | `YES` | `` |
| `anho_vehiculo` | `text` | `YES` | `` |
| `chapa` | `text` | `YES` | `` |
| `chasis` | `text` | `YES` | `` |
| `motor` | `text` | `YES` | `` |
| `estado_transferencia` | `text` | `YES` | `` |
| `medio_publicidad` | `text` | `YES` | `` |
| `club_equipo` | `text` | `YES` | `` |
| `ubicacion_marca` | `text` | `YES` | `` |
| `beneficios_pactados` | `text` | `YES` | `` |
| `entidad_emisora` | `text` | `YES` | `` |
| `numero_documento` | `text` | `YES` | `` |
| `bibliorato` | `text` | `YES` | `` |
| `programa_publicidad` | `text` | `YES` | `` |
| `horario_publicidad` | `text` | `YES` | `` |
| `frecuencia_publicidad` | `text` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_33421_10_not_null` | `CHECK` | `` |  |
| `2200_33421_11_not_null` | `CHECK` | `` |  |
| `2200_33421_13_not_null` | `CHECK` | `` |  |
| `2200_33421_14_not_null` | `CHECK` | `` |  |
| `2200_33421_19_not_null` | `CHECK` | `` |  |
| `2200_33421_1_not_null` | `CHECK` | `` |  |
| `2200_33421_2_not_null` | `CHECK` | `` |  |
| `2200_33421_7_not_null` | `CHECK` | `` |  |
| `2200_33421_8_not_null` | `CHECK` | `` |  |
| `2200_33421_9_not_null` | `CHECK` | `` |  |
| `contratos_pkey` | `PRIMARY KEY` | `id` |  |

## `distribuciones`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('distribuciones_id_seq'::regclass)` |
| `lote_id` | `integer` | `NO` | `` |
| `fecha` | `date` | `NO` | `` |
| `local` | `text` | `NO` | `` |
| `kg` | `numeric(14,2)` | `NO` | `` |
| `nota` | `text` | `YES` | `` |
| `cabezas` | `integer` | `NO` | `0` |
| `diferencia_kg` | `numeric(14,2)` | `NO` | `0` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_16895_1_not_null` | `CHECK` | `` |  |
| `2200_16895_2_not_null` | `CHECK` | `` |  |
| `2200_16895_3_not_null` | `CHECK` | `` |  |
| `2200_16895_4_not_null` | `CHECK` | `` |  |
| `2200_16895_5_not_null` | `CHECK` | `` |  |
| `2200_16895_7_not_null` | `CHECK` | `` |  |
| `2200_16895_8_not_null` | `CHECK` | `` |  |
| `distribuciones_lote_id_fkey` | `FOREIGN KEY` | `lote_id` | `lotes.id` |
| `distribuciones_pkey` | `PRIMARY KEY` | `id` |  |

## `distribuciones_eliminadas`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('distribuciones_eliminadas_id_seq'::regclass)` |
| `distribucion_id` | `integer` | `NO` | `` |
| `lote_id` | `integer` | `NO` | `` |
| `fecha` | `date` | `NO` | `` |
| `local` | `text` | `NO` | `` |
| `kg` | `numeric(14,2)` | `NO` | `` |
| `nota` | `text` | `YES` | `` |
| `cabezas` | `integer` | `NO` | `0` |
| `diferencia_kg` | `numeric(14,2)` | `NO` | `0` |
| `eliminado_en` | `timestamp without time zone` | `NO` | `now()` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_16942_10_not_null` | `CHECK` | `` |  |
| `2200_16942_1_not_null` | `CHECK` | `` |  |
| `2200_16942_2_not_null` | `CHECK` | `` |  |
| `2200_16942_3_not_null` | `CHECK` | `` |  |
| `2200_16942_4_not_null` | `CHECK` | `` |  |
| `2200_16942_5_not_null` | `CHECK` | `` |  |
| `2200_16942_6_not_null` | `CHECK` | `` |  |
| `2200_16942_8_not_null` | `CHECK` | `` |  |
| `2200_16942_9_not_null` | `CHECK` | `` |  |
| `distribuciones_eliminadas_pkey` | `PRIMARY KEY` | `id` |  |

## `faenas`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('faenas_id_seq'::regclass)` |
| `lote_id` | `integer` | `NO` | `` |
| `fecha` | `date` | `NO` | `` |
| `cantidad` | `integer` | `NO` | `` |
| `nota` | `text` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_16878_1_not_null` | `CHECK` | `` |  |
| `2200_16878_2_not_null` | `CHECK` | `` |  |
| `2200_16878_3_not_null` | `CHECK` | `` |  |
| `2200_16878_4_not_null` | `CHECK` | `` |  |
| `faenas_cantidad_check` | `CHECK` | `` |  |
| `faenas_lote_id_fkey` | `FOREIGN KEY` | `lote_id` | `lotes.id` |
| `faenas_pkey` | `PRIMARY KEY` | `id` |  |

## `gastos_flota`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('gastos_flota_id_seq'::regclass)` |
| `vehiculo_id` | `integer` | `NO` | `` |
| `fecha` | `date` | `NO` | `` |
| `tipo_gasto_id` | `integer` | `NO` | `` |
| `proveedor_id` | `integer` | `YES` | `` |
| `importe` | `numeric(14,2)` | `NO` | `` |
| `km_actual` | `numeric(12,2)` | `YES` | `` |
| `nro_factura` | `text` | `YES` | `` |
| `detalle` | `text` | `YES` | `` |
| `semana` | `integer` | `NO` | `` |
| `anho` | `integer` | `NO` | `` |
| `cargado_por` | `text` | `YES` | `` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `proveedor_nombre` | `text` | `YES` | `` |
| `proveedor_ruc` | `text` | `YES` | `` |
| `eliminado_en` | `timestamp without time zone` | `YES` | `` |
| `eliminado_por` | `text` | `YES` | `` |
| `motivo_eliminacion` | `text` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_24736_10_not_null` | `CHECK` | `` |  |
| `2200_24736_11_not_null` | `CHECK` | `` |  |
| `2200_24736_13_not_null` | `CHECK` | `` |  |
| `2200_24736_1_not_null` | `CHECK` | `` |  |
| `2200_24736_2_not_null` | `CHECK` | `` |  |
| `2200_24736_3_not_null` | `CHECK` | `` |  |
| `2200_24736_4_not_null` | `CHECK` | `` |  |
| `2200_24736_6_not_null` | `CHECK` | `` |  |
| `gastos_flota_importe_check` | `CHECK` | `` |  |
| `gastos_flota_proveedor_id_fkey` | `FOREIGN KEY` | `proveedor_id` | `proveedores_flota.id` |
| `gastos_flota_tipo_gasto_id_fkey` | `FOREIGN KEY` | `tipo_gasto_id` | `tipos_gasto_flota.id` |
| `gastos_flota_vehiculo_id_fkey` | `FOREIGN KEY` | `vehiculo_id` | `vehiculos.id` |
| `gastos_flota_pkey` | `PRIMARY KEY` | `id` |  |

## `lotes`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('lotes_id_seq'::regclass)` |
| `lote` | `text` | `NO` | `` |
| `empresa` | `text` | `NO` | `` |
| `fecha` | `date` | `NO` | `` |
| `cantidad` | `integer` | `NO` | `` |
| `monto` | `numeric(14,2)` | `NO` | `` |
| `peso_compra_kg` | `numeric(14,2)` | `NO` | `0` |
| `cerrado` | `boolean` | `NO` | `false` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_16862_1_not_null` | `CHECK` | `` |  |
| `2200_16862_2_not_null` | `CHECK` | `` |  |
| `2200_16862_3_not_null` | `CHECK` | `` |  |
| `2200_16862_4_not_null` | `CHECK` | `` |  |
| `2200_16862_5_not_null` | `CHECK` | `` |  |
| `2200_16862_6_not_null` | `CHECK` | `` |  |
| `2200_16862_7_not_null` | `CHECK` | `` |  |
| `2200_16862_8_not_null` | `CHECK` | `` |  |
| `lotes_cantidad_check` | `CHECK` | `` |  |
| `lotes_monto_check` | `CHECK` | `` |  |
| `lotes_pkey` | `PRIMARY KEY` | `id` |  |
| `lotes_lote_key` | `UNIQUE` | `lote` |  |

## `menudencias`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('menudencias_id_seq'::regclass)` |
| `sucursal` | `text` | `NO` | `` |
| `fecha` | `date` | `NO` | `` |
| `producto` | `text` | `NO` | `` |
| `kg` | `numeric(12,3)` | `NO` | `0` |
| `unidades` | `integer` | `NO` | `0` |
| `legacy_id` | `integer` | `YES` | `` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_32903_1_not_null` | `CHECK` | `` |  |
| `2200_32903_2_not_null` | `CHECK` | `` |  |
| `2200_32903_3_not_null` | `CHECK` | `` |  |
| `2200_32903_4_not_null` | `CHECK` | `` |  |
| `2200_32903_5_not_null` | `CHECK` | `` |  |
| `2200_32903_6_not_null` | `CHECK` | `` |  |
| `2200_32903_8_not_null` | `CHECK` | `` |  |
| `menudencias_sucursal_check` | `CHECK` | `` |  |
| `menudencias_valores_check` | `CHECK` | `` |  |
| `menudencias_valores_check` | `CHECK` | `` |  |
| `menudencias_pkey` | `PRIMARY KEY` | `id` |  |

## `menudencias_aregua`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('menudencias_aregua_id_seq'::regclass)` |
| `fecha` | `date` | `NO` | `` |
| `producto` | `text` | `NO` | `` |
| `kg` | `numeric(14,2)` | `NO` | `0` |
| `unidades` | `integer` | `NO` | `0` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_16913_1_not_null` | `CHECK` | `` |  |
| `2200_16913_2_not_null` | `CHECK` | `` |  |
| `2200_16913_3_not_null` | `CHECK` | `` |  |
| `2200_16913_4_not_null` | `CHECK` | `` |  |
| `2200_16913_5_not_null` | `CHECK` | `` |  |
| `menudencias_aregua_pkey` | `PRIMARY KEY` | `id` |  |

## `menudencias_catalogo`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('menudencias_catalogo_id_seq'::regclass)` |
| `producto` | `text` | `NO` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_16982_1_not_null` | `CHECK` | `` |  |
| `2200_16982_2_not_null` | `CHECK` | `` |  |
| `menudencias_catalogo_pkey` | `PRIMARY KEY` | `id` |  |

## `menudencias_itaugua`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('menudencias_itaugua_id_seq'::regclass)` |
| `fecha` | `date` | `NO` | `` |
| `producto` | `text` | `NO` | `` |
| `kg` | `numeric(14,2)` | `NO` | `0` |
| `unidades` | `integer` | `NO` | `0` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_16969_1_not_null` | `CHECK` | `` |  |
| `2200_16969_2_not_null` | `CHECK` | `` |  |
| `2200_16969_3_not_null` | `CHECK` | `` |  |
| `2200_16969_4_not_null` | `CHECK` | `` |  |
| `2200_16969_5_not_null` | `CHECK` | `` |  |
| `menudencias_itaugua_pkey` | `PRIMARY KEY` | `id` |  |

## `menudencias_luque`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('menudencias_luque_id_seq'::regclass)` |
| `fecha` | `date` | `NO` | `` |
| `producto` | `text` | `NO` | `` |
| `kg` | `numeric(14,2)` | `NO` | `0` |
| `unidades` | `integer` | `NO` | `0` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_16956_1_not_null` | `CHECK` | `` |  |
| `2200_16956_2_not_null` | `CHECK` | `` |  |
| `2200_16956_3_not_null` | `CHECK` | `` |  |
| `2200_16956_4_not_null` | `CHECK` | `` |  |
| `2200_16956_5_not_null` | `CHECK` | `` |  |
| `menudencias_luque_pkey` | `PRIMARY KEY` | `id` |  |

## `proveedores_flota`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('proveedores_flota_id_seq'::regclass)` |
| `nombre` | `text` | `NO` | `` |
| `tipo` | `text` | `NO` | `` |
| `ruc` | `text` | `YES` | `` |
| `telefono` | `text` | `YES` | `` |
| `activo` | `boolean` | `NO` | `true` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_24681_1_not_null` | `CHECK` | `` |  |
| `2200_24681_2_not_null` | `CHECK` | `` |  |
| `2200_24681_3_not_null` | `CHECK` | `` |  |
| `2200_24681_6_not_null` | `CHECK` | `` |  |
| `proveedores_flota_tipo_check` | `CHECK` | `` |  |
| `proveedores_flota_pkey` | `PRIMARY KEY` | `id` |  |
| `proveedores_flota_nombre_tipo_key` | `UNIQUE` | `nombre` |  |
| `proveedores_flota_nombre_tipo_key` | `UNIQUE` | `nombre` |  |
| `proveedores_flota_nombre_tipo_key` | `UNIQUE` | `tipo` |  |
| `proveedores_flota_nombre_tipo_key` | `UNIQUE` | `tipo` |  |

## `roles`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('roles_id_seq'::regclass)` |
| `nombre` | `text` | `NO` | `` |
| `descripcion` | `text` | `NO` | `''::text` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_24602_1_not_null` | `CHECK` | `` |  |
| `2200_24602_2_not_null` | `CHECK` | `` |  |
| `2200_24602_3_not_null` | `CHECK` | `` |  |
| `2200_24602_4_not_null` | `CHECK` | `` |  |
| `roles_pkey` | `PRIMARY KEY` | `id` |  |
| `roles_nombre_key` | `UNIQUE` | `nombre` |  |

## `sesiones`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('sesiones_id_seq'::regclass)` |
| `usuario_id` | `integer` | `NO` | `` |
| `token` | `text` | `NO` | `` |
| `creada_en` | `timestamp without time zone` | `NO` | `now()` |
| `expira_en` | `timestamp without time zone` | `NO` | `` |
| `cerrada_en` | `timestamp without time zone` | `YES` | `` |
| `ip` | `text` | `YES` | `` |
| `user_agent` | `text` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_24638_1_not_null` | `CHECK` | `` |  |
| `2200_24638_2_not_null` | `CHECK` | `` |  |
| `2200_24638_3_not_null` | `CHECK` | `` |  |
| `2200_24638_4_not_null` | `CHECK` | `` |  |
| `2200_24638_5_not_null` | `CHECK` | `` |  |
| `sesiones_usuario_id_fkey` | `FOREIGN KEY` | `usuario_id` | `usuarios.id` |
| `sesiones_pkey` | `PRIMARY KEY` | `id` |  |
| `sesiones_token_key` | `UNIQUE` | `token` |  |

## `tipos_gasto_flota`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('tipos_gasto_flota_id_seq'::regclass)` |
| `nombre` | `text` | `NO` | `` |
| `requiere_km` | `boolean` | `NO` | `false` |
| `activo` | `boolean` | `NO` | `true` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_24696_1_not_null` | `CHECK` | `` |  |
| `2200_24696_2_not_null` | `CHECK` | `` |  |
| `2200_24696_3_not_null` | `CHECK` | `` |  |
| `2200_24696_4_not_null` | `CHECK` | `` |  |
| `tipos_gasto_flota_pkey` | `PRIMARY KEY` | `id` |  |
| `tipos_gasto_flota_nombre_key` | `UNIQUE` | `nombre` |  |

## `usuarios`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('usuarios_id_seq'::regclass)` |
| `username` | `text` | `NO` | `` |
| `nombre` | `text` | `NO` | `` |
| `password_hash` | `text` | `NO` | `` |
| `rol_id` | `integer` | `NO` | `` |
| `activo` | `boolean` | `NO` | `true` |
| `ultimo_login` | `timestamp without time zone` | `YES` | `` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |
| `actualizado_en` | `timestamp without time zone` | `NO` | `now()` |
| `sucursal_permitida` | `text` | `YES` | `` |
| `modulos_permitidos` | `jsonb` | `YES` | `` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_24617_1_not_null` | `CHECK` | `` |  |
| `2200_24617_2_not_null` | `CHECK` | `` |  |
| `2200_24617_3_not_null` | `CHECK` | `` |  |
| `2200_24617_4_not_null` | `CHECK` | `` |  |
| `2200_24617_5_not_null` | `CHECK` | `` |  |
| `2200_24617_6_not_null` | `CHECK` | `` |  |
| `2200_24617_8_not_null` | `CHECK` | `` |  |
| `2200_24617_9_not_null` | `CHECK` | `` |  |
| `usuarios_sucursal_permitida_check` | `CHECK` | `` |  |
| `usuarios_rol_id_fkey` | `FOREIGN KEY` | `rol_id` | `roles.id` |
| `usuarios_pkey` | `PRIMARY KEY` | `id` |  |
| `usuarios_username_key` | `UNIQUE` | `username` |  |

## `vehiculos`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('vehiculos_id_seq'::regclass)` |
| `codigo` | `text` | `YES` | `` |
| `chapa` | `text` | `YES` | `` |
| `nombre` | `text` | `NO` | `` |
| `marca` | `text` | `YES` | `` |
| `modelo` | `text` | `YES` | `` |
| `anho` | `integer` | `YES` | `` |
| `tipo` | `text` | `YES` | `` |
| `sucursal` | `text` | `YES` | `` |
| `chofer` | `text` | `YES` | `` |
| `activo` | `boolean` | `NO` | `true` |
| `creado_en` | `timestamp without time zone` | `NO` | `now()` |

### Restricciones

| Nombre | Tipo | Columna | Referencia |
|---|---|---|---|
| `2200_24663_11_not_null` | `CHECK` | `` |  |
| `2200_24663_12_not_null` | `CHECK` | `` |  |
| `2200_24663_1_not_null` | `CHECK` | `` |  |
| `2200_24663_4_not_null` | `CHECK` | `` |  |
| `vehiculos_sucursal_check` | `CHECK` | `` |  |
| `vehiculos_pkey` | `PRIMARY KEY` | `id` |  |
