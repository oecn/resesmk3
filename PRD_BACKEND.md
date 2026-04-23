# PRD — Backend del Sistema de Gestión de Hacienda (Reces MK13)

**Versión:** 1.0  
**Fecha:** 2026-04-23  
**Estado:** Borrador  
**Responsable técnico:** Equipo Reces MK13

---

## 1. Visión General

### 1.1 Propósito del sistema

El backend de Reces MK13 es la API central que soporta la operación diaria de un negocio de compra, faena y distribución de hacienda. Gestiona el flujo completo: desde la compra de lotes hasta la recepción física en sucursales, pasando por faena, distribución y análisis financiero. Adicionalmente administra la flota de vehículos asociada a la operación logística.

### 1.2 Problema que resuelve

Antes del sistema, el control operativo se realizaba en planillas Excel desconectadas, generando:
- Imposibilidad de conocer en tiempo real cuánto se distribuyó vs. lo faenado.
- Faltantes y sobrantes no trazados por sucursal.
- Sin costo/kg calculado automáticamente por lote.
- Control de flota y combustible no centralizado.
- Sin historial de recepción ni generación de PDFs operativos.

### 1.3 Alcance actual (v1)

| Módulo | Estado |
|---|---|
| Autenticación y sesiones | Implementado |
| Dashboard KPIs | Implementado |
| Compras y faena | Implementado |
| Distribuciones | Implementado |
| Recepción por sucursal | Implementado |
| Resúmenes analíticos | Implementado |
| Administración de usuarios | Implementado |
| Flota (vehículos, combustible, gastos) | Implementado |
| Exportación PDF | Implementado |
| Importación Excel (combustible) | Implementado |

---

## 2. Arquitectura Técnica

### 2.1 Stack actual

| Capa | Tecnología | Versión |
|---|---|---|
| Servidor HTTP | Python `http.server.ThreadingHTTPServer` | stdlib |
| Base de datos | PostgreSQL | ≥ 14 |
| Driver BD | psycopg2-binary | latest |
| Generación PDF | reportlab | latest |
| Importación Excel | openpyxl | latest |
| Runtime | Python | ≥ 3.10 |

### 2.2 Modelo de despliegue

```
[Frontend Angular :4200]
        │  HTTP + Cookie (withCredentials)
        ▼
[Backend Python :8008]   ←→   [PostgreSQL :5432]
  (ThreadingHTTPServer)          192.168.10.13
  0.0.0.0:8008
```

- El backend escucha en `0.0.0.0:8008` (todas las interfaces de red).
- La base de datos está en `192.168.10.13:5432`, base de datos `reces`.
- Configuración via variable de entorno `DATABASE_URL`.

### 2.3 Estructura de archivos del backend

```
web/
├── run.py                          # Entry point
└── backend/
    ├── config.py                   # Configuración global
    ├── dashboard_api.py            # Handler HTTP + Repository (monolítico, ~3600 líneas)
    ├── requirements.txt            # Dependencias pip
    ├── auth/
    │   ├── services/auth_service.py
    │   ├── repositories/auth_repository.py
    │   └── security/passwords.py
    └── migrations/
        ├── 001_auth_schema.sql
        ├── 001_auth_schema.py
        ├── 002_usuario_sucursal.py
        ├── 003_flota_base.sql
        ├── 003_flota_base.py
        ├── 004_gastos_flota_proveedor_manual.py
        ├── 005_flota_vehiculos_incompletos.py
        ├── 006_flota_tipo_combustible.py
        └── 007_lote_cerrado.py
```

---

## 3. Modelo de Datos

### 3.1 Dominio: Autenticación

#### `roles`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| nombre | VARCHAR | admin, supervisor, recepcion |
| descripcion | TEXT | |
| creado_en | TIMESTAMP | |

#### `usuarios`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| username | VARCHAR UNIQUE | Login |
| nombre | VARCHAR | Nombre completo |
| password_hash | TEXT | PBKDF2-SHA256, 390.000 iteraciones |
| rol_id | FK → roles | |
| activo | BOOLEAN | Soft-delete lógico |
| sucursal_permitida | VARCHAR NULL | luque / aregua / itaugua (solo rol recepcion) |
| ultimo_login | TIMESTAMP | |
| creado_en | TIMESTAMP | |
| actualizado_en | TIMESTAMP | |

#### `sesiones`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| usuario_id | FK → usuarios | |
| token | VARCHAR UNIQUE | URL-safe aleatorio 32 bytes |
| creada_en | TIMESTAMP | |
| expira_en | TIMESTAMP | creada_en + 7 días |
| cerrada_en | TIMESTAMP NULL | Cierre explícito (logout) |
| ip | VARCHAR | IP del cliente |
| user_agent | TEXT | |

### 3.2 Dominio: Operaciones

#### `lotes`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| lote | VARCHAR | Identificador de lote |
| empresa | VARCHAR | Corral / Rodeo / Ferusa / TROPA |
| fecha | DATE | Fecha de compra |
| cantidad | INTEGER | Cabezas compradas |
| monto | NUMERIC | Monto pagado (Gs.) |
| peso_compra_kg | NUMERIC | Peso vivo en compra |
| cerrado | BOOLEAN DEFAULT FALSE | Lote contabilizado y cerrado |

#### `faenas`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| lote_id | FK → lotes | |
| cantidad | INTEGER | Cabezas faenadas |
| fecha | DATE | |
| nota | TEXT | |

#### `distribuciones`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| lote_id | FK → lotes | |
| fecha | DATE | |
| local | VARCHAR | LUQUE / AREGUA / ITAUGUA |
| kg | NUMERIC | Kilogramos enviados |
| cabezas | INTEGER | Cabezas enviadas |
| nota | TEXT | |
| diferencia_kg | NUMERIC | Desvío respecto a recepción |

#### `menudencias_aregua` / `menudencias_luque` / `menudencias_itaugua`
*(misma estructura por sucursal)*
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| fecha | DATE | |
| producto | VARCHAR | Tipo de menudencia |
| kg | NUMERIC | |
| unidades | INTEGER | |

### 3.3 Dominio: Flota

#### `vehiculos`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| codigo | VARCHAR | Código interno |
| nombre | VARCHAR | Nombre descriptivo |
| chapa | VARCHAR | Patente/matrícula |
| marca | VARCHAR | |
| modelo | VARCHAR | |
| anho | INTEGER | Año |
| tipo | VARCHAR | camion / utilitario / auto / moto |
| sucursal | VARCHAR | |
| chofer | VARCHAR | |
| activo | BOOLEAN | |
| creado_en | TIMESTAMP | |
| actualizado_en | TIMESTAMP | |

#### `proveedores_flota`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| nombre | VARCHAR | |
| tipo | VARCHAR | combustible / taller / otros |
| ruc | VARCHAR | |
| telefono | VARCHAR | |
| activo | BOOLEAN | |

#### `tipos_gasto_flota`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| nombre | VARCHAR | |
| activo | BOOLEAN | |

#### `cargas_combustible`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| vehiculo_id | FK → vehiculos | |
| fecha | DATE | |
| proveedor_id | FK → proveedores_flota | |
| litros | NUMERIC | |
| importe | NUMERIC | Monto total (Gs.) |
| precio_litro | NUMERIC | Calculado automáticamente |
| tipo_combustible | VARCHAR | gasoil / nafta |
| km_actual | INTEGER | Odómetro |
| nro_factura | VARCHAR | |
| observacion | TEXT | |
| semana | INTEGER | Semana ISO |
| anho | INTEGER | |
| cargado_por | VARCHAR | username |
| eliminado_en | TIMESTAMP NULL | Soft delete |
| eliminado_por | VARCHAR NULL | |
| motivo_eliminacion | TEXT NULL | |

#### `gastos_flota`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| vehiculo_id | FK → vehiculos | |
| fecha | DATE | |
| tipo_gasto_id | FK → tipos_gasto_flota | |
| importe | NUMERIC | |
| km_actual | INTEGER | |
| proveedor_id | FK NULL → proveedores_flota | |
| proveedor_nombre | VARCHAR NULL | Ingreso manual |
| proveedor_ruc | VARCHAR NULL | Ingreso manual |
| factura | VARCHAR | |
| detalle | TEXT | |
| cargado_por | VARCHAR | username |

---

## 4. API — Especificación de Endpoints

### 4.1 Convenciones generales

- Base URL: `http://<host>:8008/api`
- Autenticación: Cookie `rces_session=<token>` (HttpOnly, SameSite=Lax)
- Formato de respuesta: `Content-Type: application/json`
- Errores: `{ "error": "mensaje descriptivo" }` con código HTTP apropiado
- Fechas: formato ISO 8601 (`YYYY-MM-DD`)
- Números: decimales con punto (`.`) en JSON; el parser acepta formato ES (`1.000,50`) y EN (`1,000.50`) en inputs

### 4.2 Health Check

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Estado del servidor |

**Respuesta 200:**
```json
{ "status": "ok", "timestamp": "2026-04-23T10:00:00" }
```

---

### 4.3 Autenticación (`/api/auth`)

#### POST `/api/auth/login`
Inicia sesión. No requiere autenticación previa.

**Body:**
```json
{ "username": "admin", "password": "secreto" }
```

**Respuesta 200:**
```json
{
  "id": 1,
  "username": "admin",
  "nombre": "Administrador",
  "rol": "admin",
  "sucursal_permitida": null
}
```
+ Header `Set-Cookie: rces_session=TOKEN; HttpOnly; SameSite=Lax; Path=/`

**Errores:** `401` credenciales inválidas, `403` usuario inactivo.

---

#### POST `/api/auth/logout`
Cierra la sesión activa. Requiere cookie válida.

**Respuesta 200:** `{ "ok": true }`

---

#### GET `/api/auth/me`
Devuelve el usuario autenticado actualmente.

**Respuesta 200:**
```json
{
  "id": 1,
  "username": "admin",
  "nombre": "Administrador",
  "rol": "admin",
  "sucursal_permitida": null
}
```
**Error:** `401` si no hay sesión activa.

---

#### GET `/api/auth/users`
Lista todos los usuarios. **Rol requerido:** `admin`.

**Respuesta 200:**
```json
{
  "usuarios": [
    {
      "id": 1, "username": "admin", "nombre": "Administrador",
      "rol": "admin", "activo": true, "sucursal_permitida": null,
      "ultimo_login": "2026-04-22T18:30:00"
    }
  ],
  "roles": [
    { "id": 1, "nombre": "admin" },
    { "id": 2, "nombre": "supervisor" },
    { "id": 3, "nombre": "recepcion" }
  ]
}
```

---

#### POST `/api/auth/users`
Crea un nuevo usuario. **Rol requerido:** `admin`.

**Body:**
```json
{
  "username": "luque01",
  "nombre": "Operario Luque",
  "password": "clave123",
  "rol_id": 3,
  "sucursal_permitida": "luque"
}
```
**Respuesta 201:** `{ "id": 5, "ok": true }`  
**Error:** `409` username ya existe.

---

#### PUT `/api/auth/users`
Edita datos de un usuario existente. **Rol requerido:** `admin`.

**Body:**
```json
{
  "id": 5,
  "nombre": "Nuevo Nombre",
  "rol_id": 2,
  "activo": true,
  "sucursal_permitida": null
}
```
**Respuesta 200:** `{ "ok": true }`

---

#### PUT `/api/auth/users/password`
Cambia la contraseña de un usuario. **Rol requerido:** `admin`.

**Body:**
```json
{ "id": 5, "password": "nuevaclave456" }
```
**Respuesta 200:** `{ "ok": true }`

---

### 4.4 Dashboard (`/api/dashboard`)

#### GET `/api/dashboard`
Devuelve KPIs consolidados de la operación.

**Query params:**  
| Parámetro | Tipo | Descripción |
|---|---|---|
| desde | DATE | Filtro desde fecha |
| hasta | DATE | Filtro hasta fecha |

**Respuesta 200:**
```json
{
  "resumen": {
    "total_lotes": 45,
    "total_cabezas": 1200,
    "total_kg_distribuidos": 85000.5,
    "total_monto": 450000000
  },
  "compras_por_empresa": [
    { "empresa": "Corral", "lotes": 20, "cabezas": 600, "monto": 200000000 }
  ],
  "distribuciones_por_local": [
    { "local": "LUQUE", "kg": 40000, "cabezas": 600 }
  ],
  "menudencias": [
    { "sucursal": "Luque", "producto": "Higado", "kg": 150.5, "unidades": 30 }
  ]
}
```

---

### 4.5 Compras y Faena (`/api/compras-faena`)

#### GET `/api/compras-faena`
Lista lotes con su faena asociada.

**Query params:**
| Parámetro | Tipo | Descripción |
|---|---|---|
| desde | DATE | Filtro fecha desde |
| hasta | DATE | Filtro fecha hasta |
| empresa | STRING | Filtro empresa |
| lote | STRING | Búsqueda por número de lote |

**Respuesta 200:**
```json
{
  "lotes": [
    {
      "id": 10,
      "lote": "L-2026-010",
      "empresa": "Corral",
      "fecha": "2026-04-20",
      "cantidad": 50,
      "monto": 15000000,
      "peso_compra_kg": 12500.0,
      "cerrado": false,
      "faenas": [
        { "id": 3, "cantidad": 48, "fecha": "2026-04-21", "nota": "" }
      ],
      "total_faenado": 48
    }
  ]
}
```

---

#### POST `/api/compras-faena/lotes`
Crea o edita un lote de compra. **Rol requerido:** `admin`, `supervisor`.

**Body (crear):**
```json
{
  "lote": "L-2026-011",
  "empresa": "Rodeo",
  "fecha": "2026-04-23",
  "cantidad": 60,
  "monto": 18000000,
  "peso_compra_kg": 15000.0
}
```

**Body (editar — incluir `id`):**
```json
{ "id": 10, "monto": 15500000, ... }
```
**Respuesta 200/201:** `{ "id": 11, "ok": true }`

---

#### POST `/api/compras-faena/faenas`
Agrega un registro de faena a un lote. **Rol requerido:** `admin`, `supervisor`.

**Body:**
```json
{
  "lote_id": 10,
  "cantidad": 5,
  "fecha": "2026-04-22",
  "nota": "Faena parcial"
}
```
**Respuesta 201:** `{ "id": 8, "ok": true }`  
**Error:** `400` si cabezas faenadas superan lo distribuido.

---

#### POST `/api/compras-faena/faena-total`
Ajusta directamente el total faenado del lote (override). **Rol requerido:** `admin`.

**Body:**
```json
{ "lote_id": 10, "total_faenado": 50 }
```
**Respuesta 200:** `{ "ok": true }`

---

### 4.6 Distribuciones (`/api/distribuciones`)

#### GET `/api/distribuciones`
Lista lotes disponibles para distribuir con sus distribuciones actuales.

**Query params:**
| Parámetro | Tipo | Descripción |
|---|---|---|
| lote_id | INTEGER | Filtrar por lote específico |
| desde | DATE | |
| hasta | DATE | |

**Respuesta 200:**
```json
{
  "lotes": [
    {
      "id": 10,
      "lote": "L-2026-010",
      "empresa": "Corral",
      "faenado": 48,
      "distribuido_kg": 11800.0,
      "distribuido_cabezas": 45,
      "saldo_cabezas": 3,
      "distribuciones": [
        {
          "id": 7, "local": "LUQUE", "fecha": "2026-04-21",
          "kg": 5000.0, "cabezas": 20, "nota": ""
        }
      ]
    }
  ]
}
```

---

#### POST `/api/distribuciones`
Crea una nueva distribución. **Rol requerido:** `admin`, `supervisor`.

**Body:**
```json
{
  "lote_id": 10,
  "local": "AREGUA",
  "fecha": "2026-04-22",
  "kg": 3200.0,
  "cabezas": 15,
  "nota": ""
}
```
**Respuesta 201:** `{ "id": 9, "ok": true }`  
**Error:** `400` si cabezas distribuidas superan faenado.

---

#### DELETE `/api/distribuciones`
Elimina una distribución. **Rol requerido:** `admin`, `supervisor`.

**Query params:** `?id=9`  
**Respuesta 200:** `{ "ok": true }`  
**Error:** `403` si distribución ya fue recepcionada.

---

### 4.7 Recepción por Sucursal (`/api/recepcion/{slug}`)

`{slug}` = `luque` | `aregua` | `itaugua`

**Control de acceso:** rol `admin` y `supervisor` acceden a todas; rol `recepcion` solo a su `sucursal_permitida`.

---

#### GET `/api/recepcion/{slug}`
Devuelve distribuciones esperadas y estado de recepción.

**Query params:**
| Parámetro | Tipo | Descripción |
|---|---|---|
| fecha | DATE | Fecha de recepción (default: hoy) |

**Respuesta 200:**
```json
{
  "slug": "luque",
  "fecha": "2026-04-23",
  "distribuciones": [
    {
      "id": 7,
      "lote": "L-2026-010",
      "empresa": "Corral",
      "kg_enviado": 5000.0,
      "cabezas_enviadas": 20,
      "kg_recibido": 4980.0,
      "diferencia_kg": -20.0,
      "nota_recepcion": "Faltó un paquete"
    }
  ],
  "menudencias": [
    { "id": 3, "producto": "Higado", "kg": 60.5, "unidades": 12 }
  ],
  "resumen": {
    "total_enviado_kg": 5000.0,
    "total_recibido_kg": 4980.0,
    "diferencia_total_kg": -20.0
  }
}
```

---

#### POST `/api/recepcion/{slug}/distribuciones`
Registra o actualiza la recepción física de una distribución.

**Body:**
```json
{
  "distribucion_id": 7,
  "kg_recibido": 4980.0,
  "nota_recepcion": "Faltó un paquete"
}
```
**Respuesta 200:** `{ "ok": true }`

---

#### GET `/api/recepcion/{slug}/pdf`
Genera y descarga PDF de recepción del día.

**Query params:** `?fecha=2026-04-23`  
**Respuesta 200:** `Content-Type: application/pdf`

---

#### POST `/api/recepcion/{slug}/menudencias`
Agrega un registro de menudencia.

**Body:**
```json
{ "fecha": "2026-04-23", "producto": "Higado", "kg": 60.5, "unidades": 12 }
```
**Respuesta 201:** `{ "id": 4, "ok": true }`

---

#### PUT `/api/recepcion/{slug}/menudencias`
Edita una menudencia existente.

**Body:**
```json
{ "id": 4, "kg": 65.0, "unidades": 13 }
```
**Respuesta 200:** `{ "ok": true }`

---

#### DELETE `/api/recepcion/{slug}/menudencias/{id}`
Elimina una menudencia. **Rol requerido:** `admin`, `supervisor`.

**Respuesta 200:** `{ "ok": true }`

---

### 4.8 Resúmenes Analíticos (`/api/resumenes`)

#### GET `/api/resumenes`
Listado analítico de lotes con métricas consolidadas.

**Query params:**
| Parámetro | Tipo | Descripción |
|---|---|---|
| desde | DATE | |
| hasta | DATE | |
| empresa | STRING | |
| q | STRING | Búsqueda libre por lote |
| cerrado | BOOLEAN | true = solo cerrados, false = solo abiertos |

**Respuesta 200:**
```json
{
  "resumenes": [
    {
      "id": 10,
      "lote": "L-2026-010",
      "empresa": "Corral",
      "fecha": "2026-04-20",
      "cantidad": 50,
      "monto": 15000000,
      "peso_compra_kg": 12500.0,
      "total_faenado": 48,
      "kg_distribuidos": 11800.0,
      "cabezas_distribuidas": 45,
      "costo_kg": 1271.19,
      "rendimiento_pct": 94.4,
      "pct_distribuido": 93.75,
      "cerrado": false
    }
  ],
  "totales": {
    "lotes": 1,
    "cabezas": 50,
    "monto": 15000000,
    "kg_distribuidos": 11800.0
  }
}
```

---

#### GET `/api/resumenes/pdf`
Genera PDF de resúmenes para los lotes seleccionados.

**Query params:** `?lote_ids=10,11,12`  
**Respuesta 200:** `Content-Type: application/pdf`

---

#### POST `/api/resumenes/cerrar`
Marca lotes como cerrados. **Rol requerido:** `admin`, `supervisor`.

**Body:**
```json
{ "lote_ids": [10, 11] }
```
**Respuesta 200:** `{ "ok": true, "cerrados": 2 }`

---

### 4.9 Flota — Catálogos

#### GET `/api/flota/catalogos`
Devuelve catálogos necesarios para el módulo de flota.

**Respuesta 200:**
```json
{
  "vehiculos": [
    {
      "id": 1, "codigo": "CAM-01", "nombre": "Camión Luque",
      "chapa": "ABC 123", "marca": "Mercedes", "tipo": "camion",
      "sucursal": "luque", "chofer": "Juan Pérez", "activo": true
    }
  ],
  "proveedores": [
    { "id": 1, "nombre": "YPF Luque", "tipo": "combustible", "activo": true }
  ],
  "tipos_gasto": [
    { "id": 1, "nombre": "Mantenimiento", "activo": true }
  ]
}
```

---

### 4.10 Flota — Vehículos

#### GET `/api/flota/vehiculos`
Lista vehículos con filtros opcionales.

**Query params:** `?activo=true&sucursal=luque`

---

#### POST `/api/flota/vehiculos`
Crea o edita un vehículo. **Rol requerido:** `admin`.

**Body:**
```json
{
  "codigo": "CAM-02", "nombre": "Camión Aregua",
  "chapa": "XYZ 456", "marca": "Iveco",
  "modelo": "Tector", "anho": 2020,
  "tipo": "camion", "sucursal": "aregua",
  "chofer": "Pedro García", "activo": true
}
```

---

#### PUT `/api/flota/vehiculos/{id}`
Actualiza vehículo. **Rol requerido:** `admin`.

---

#### POST `/api/flota/proveedores`
Crea proveedor. **Rol requerido:** `admin`.

---

#### PUT `/api/flota/proveedores/{id}`
Actualiza proveedor. **Rol requerido:** `admin`.

---

### 4.11 Flota — Combustible

#### GET `/api/flota/combustible`
Lista cargas de combustible con filtros.

**Query params:**
| Parámetro | Tipo | Descripción |
|---|---|---|
| desde | DATE | |
| hasta | DATE | |
| vehiculo_id | INTEGER | |
| sucursal | STRING | |

**Respuesta 200:**
```json
{
  "cargas": [
    {
      "id": 15, "vehiculo_id": 1, "vehiculo_nombre": "Camión Luque",
      "fecha": "2026-04-22", "proveedor_nombre": "YPF Luque",
      "litros": 200.0, "importe": 600000, "precio_litro": 3000.0,
      "tipo_combustible": "gasoil", "km_actual": 85000,
      "nro_factura": "001-001-0001234", "cargado_por": "admin"
    }
  ],
  "totales": { "litros": 200.0, "importe": 600000 }
}
```

---

#### POST `/api/flota/combustible`
Registra nueva carga de combustible.

**Body:**
```json
{
  "vehiculo_id": 1, "fecha": "2026-04-23",
  "proveedor_id": 1, "litros": 150.0,
  "importe": 450000, "tipo_combustible": "gasoil",
  "km_actual": 85200, "nro_factura": "001-001-0001235"
}
```
**Respuesta 201:** `{ "id": 16, "ok": true }`

---

#### POST `/api/flota/combustible/eliminar`
Elimina (soft delete) una carga. **Rol requerido:** `admin`.

**Body:**
```json
{ "id": 16, "motivo": "Carga duplicada" }
```

---

#### POST `/api/flota/combustible/import/preview`
Vista previa de importación desde Excel (sin persistir).

**Body:** `multipart/form-data` con campo `file` (`.xlsx`).

**Respuesta 200:**
```json
{
  "preview": [
    { "fila": 2, "vehiculo": "Camión Luque", "litros": 200, "importe": 600000, "ok": true }
  ],
  "errores": []
}
```

---

#### POST `/api/flota/combustible/import`
Confirma importación desde Excel.

**Body:** `multipart/form-data` con campo `file` (`.xlsx`).

**Respuesta 200:** `{ "importados": 12, "errores": [] }`

---

### 4.12 Flota — Gastos

#### GET `/api/flota/gastos`
Lista gastos con filtros.

**Query params:** `?desde=2026-04-01&hasta=2026-04-30&vehiculo_id=1&tipo_gasto_id=2`

---

#### POST `/api/flota/gastos`
Registra nuevo gasto.

**Body:**
```json
{
  "vehiculo_id": 1, "fecha": "2026-04-23",
  "tipo_gasto_id": 1, "importe": 250000,
  "km_actual": 85200, "proveedor_id": 2,
  "factura": "001-001-0000500", "detalle": "Cambio de aceite"
}
```

---

### 4.13 Flota — Resúmenes

#### GET `/api/flota/resumen-semanal`
Resumen de combustible y gastos por semana.

**Query params:** `?semana=17&anho=2026&vehiculo_id=1&sucursal=luque`

---

#### GET `/api/flota/resumen-mensual/pdf`
PDF de resumen mensual de flota.

**Query params:** `?mes=4&anho=2026&vehiculo_id=1&sucursal=luque`  
**Respuesta 200:** `Content-Type: application/pdf`

---

## 5. Seguridad

### 5.1 Autenticación

- **Mecanismo:** Cookie de sesión `rces_session` (HttpOnly, SameSite=Lax).
- **Token:** generado con `secrets.token_urlsafe(32)` — 43 caracteres URL-safe, 256 bits de entropía efectiva.
- **TTL de sesión:** 7 días desde creación.
- **Revocación:** Logout explicito marca `cerrada_en`. Expiración evaluada en cada request.

### 5.2 Contraseñas

- Hash con PBKDF2-HMAC-SHA256, 390.000 iteraciones, sal aleatoria por usuario.
- Almacenado en formato: `pbkdf2_sha256$390000$<sal_hex>$<hash_hex>`.
- Verificación en tiempo constante (resistente a timing attacks).

### 5.3 Autorización por rol

| Operación | admin | supervisor | recepcion |
|---|:---:|:---:|:---:|
| Ver dashboard | ✓ | ✓ | — |
| Compras y faena | ✓ | ✓ | — |
| Distribuciones | ✓ | ✓ | — |
| Resúmenes analíticos | ✓ | ✓ | — |
| Cerrar lotes | ✓ | ✓ | — |
| Recepción (todas) | ✓ | ✓ | — |
| Recepción (su sucursal) | ✓ | ✓ | ✓ |
| Flota | ✓ | ✓ | ✓ (su sucursal) |
| Administración usuarios | ✓ | — | — |
| Crear/editar catálogos flota | ✓ | — | — |

### 5.4 SQL Injection

- Todas las queries usan parámetros posicionales `%s` de psycopg2. No se concatena input de usuario en SQL.

### 5.5 Headers CORS

- El handler responde con headers `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true` y métodos permitidos para soportar el frontend Angular corriendo en un origin diferente.

---

## 6. Configuración de Entorno

### 6.1 Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@192.168.10.13:5432/reces` | Cadena de conexión PostgreSQL |

### 6.2 Constantes en `config.py`

| Constante | Valor | Descripción |
|---|---|---|
| `EMPRESAS` | `["Corral", "Rodeo", "Ferusa", "TROPA"]` | Empresas proveedoras habilitadas |
| `LOCALES` | `["LUQUE", "AREGUA", "ITAUGUA"]` | Sucursales operativas |

### 6.3 Puerto del servidor

El servidor escucha en `0.0.0.0:8008`. Configurable directamente en `dashboard_api.py`.

---

## 7. Migraciones de Base de Datos

Las migraciones se ejecutan manualmente en orden. No hay herramienta de migración automática (e.g., Alembic).

| Migración | Descripción |
|---|---|
| `001_auth_schema` | Schema de autenticación + usuario admin inicial |
| `002_usuario_sucursal` | Columna `sucursal_permitida` en `usuarios` |
| `003_flota_base` | Tablas de flota (vehículos, proveedores, tipos_gasto, cargas, gastos) |
| `004_gastos_flota_proveedor_manual` | Campos manuales de proveedor en gastos |
| `005_flota_vehiculos_incompletos` | Ajustes a campos de vehículos |
| `006_flota_tipo_combustible` | Columna `tipo_combustible` en cargas |
| `007_lote_cerrado` | Columna `cerrado` en `lotes` |

**Mecanismo defensivo:** El método `_ensure_schema()` ejecuta al iniciar el servidor y aplica `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para las columnas más recientes, evitando errores si las migraciones no fueron ejecutadas.

---

## 8. Generación de PDFs

El sistema usa **ReportLab** para generar tres tipos de documentos:

| PDF | Endpoint | Contenido |
|---|---|---|
| Recepción diaria | `GET /api/recepcion/{slug}/pdf` | Distribuciones esperadas/recibidas, diferencias, menudencias |
| Resúmenes de lotes | `GET /api/resumenes/pdf` | KPIs por lote: compra, faena, distribución, costo/kg |
| Resumen mensual flota | `GET /api/flota/resumen-mensual/pdf` | Combustible y gastos por vehículo en el mes |

Los PDFs se sirven inline con `Content-Disposition: inline; filename="..."` y son generados en memoria (sin archivos temporales).

---

## 9. Importación de Datos

### 9.1 Combustible desde Excel

- Formato: `.xlsx` con headers normalizados (sin acentos, case-insensitive).
- Columnas esperadas: vehículo (referencia), fecha, litros, importe, tipo_combustible, km, factura, observación.
- Flujo: **preview** primero → usuario confirma → **import** persiste.
- El preview muestra filas con estado `ok: true` o mensaje de error por fila (vehículo no encontrado, fecha inválida, etc.).

---

## 10. Lógica de Negocio Clave

### 10.1 Cálculo de métricas por lote

```
costo_kg         = monto / peso_compra_kg
rendimiento_pct  = (kg_distribuidos / peso_compra_kg) × 100
pct_distribuido  = (cabezas_distribuidas / total_faenado) × 100
saldo_cabezas    = total_faenado − cabezas_distribuidas
```

### 10.2 Restricciones operativas

- **Faena**: `total_faenado ≥ cabezas_distribuidas` (no puede reducir faena por debajo de lo ya distribuido).
- **Distribución**: `cabezas_distribuidas ≤ total_faenado` (no distribuir más de lo faenado).
- **Lote cerrado**: Una vez marcado como `cerrado = true`, no se permiten modificaciones (faenas ni distribuciones).
- **Eliminación de distribución**: Solo si la distribución no tiene recepción registrada en sucursal.

### 10.3 CTE de resúmenes

El endpoint `/api/resumenes` usa una CTE SQL (`_resumen_lotes_cte`) que consolida en una sola query:
- JOIN a `faenas` → suma de cantidad faenada.
- JOIN a `distribuciones` → suma de kg y cabezas por local.
- Cálculos derivados como columnas.

### 10.4 Formato numérico paraguayo

El parser de números acepta ambos formatos:
- ES: `1.200.500,75` → `1200500.75`
- EN: `1,200,500.75` → `1200500.75`
- Sin separador: `1200500.75` → `1200500.75`

---

## 11. Manejo de Conexiones a Base de Datos

- Se crea una **nueva conexión por request** (no hay pool).
- Conexiones de solo lectura (`readonly=True`) usan autocommit.
- Conexiones de escritura usan commit explícito o rollback en caso de excepción.
- El `finally` de cada handler cierra la conexión para evitar leaks.

---

## 12. Requisitos No Funcionales

| Requisito | Valor objetivo |
|---|---|
| Tiempo de respuesta (GET simple) | < 500 ms |
| Tiempo de respuesta (PDF) | < 3 segundos |
| Concurrencia | ThreadingHTTPServer (un thread por request) |
| Disponibilidad | Horario operativo (sin SLA formal definido) |
| Seguridad de contraseñas | PBKDF2-SHA256 / 390.000 iteraciones |
| Retención de sesiones | 7 días TTL |
| Entorno objetivo | LAN interna, sin exposición a Internet |

---

## 13. Deuda Técnica Documentada

### 13.1 Alta prioridad

| Ítem | Descripción | Impacto |
|---|---|---|
| `dashboard_api.py` monolítico | ~3600 líneas en un solo archivo | Dificulta mantenimiento, testing y onboarding |
| Sin pool de conexiones | Nueva conexión por request | Overhead de latencia en carga concurrente |
| Sesiones sin limpieza | Tabla `sesiones` crece indefinidamente | Degradación de performance en consultas de sesión |
| Sin logging estructurado | `print()` dispersos | Imposible auditar en producción |

### 13.2 Media prioridad

| Ítem | Descripción |
|---|---|
| Sin framework de migraciones | Alembic o Flyway permitiría versionado formal |
| Sin tests automatizados | Cualquier refactor requiere validación manual completa |
| URL backend hardcodeada en frontend | `192.168.10.12:8008` en `environment.ts` |

### 13.3 Baja prioridad

| Ítem | Descripción |
|---|---|
| Sin framework HTTP | Migrar a FastAPI o Flask simplificaría routing y validación |
| Tablas menudencias por sucursal | 3 tablas idénticas → una tabla con columna `sucursal` |
| Sin paginación | Endpoints que retornan listas no paginated |

---

## 14. Roadmap Propuesto

### Fase 1 — Estabilización (próximas 4 semanas)

- [ ] Implementar limpieza periódica de sesiones expiradas (job o trigger SQL).
- [ ] Agregar logging estructurado (JSON) con nivel configurable.
- [ ] Parametrizar puerto del servidor vía env var.
- [ ] Documentar procedimiento de backup de la base de datos.

### Fase 2 — Modularización (2–3 meses)

- [ ] Separar `dashboard_api.py` en módulos por dominio: `auth`, `compras_faena`, `distribuciones`, `recepcion`, `resumenes`, `flota`.
- [ ] Introducir pool de conexiones (e.g., `psycopg2.pool.ThreadedConnectionPool`).
- [ ] Agregar tests de integración para flujos críticos (compra → faena → distribución → recepción).
- [ ] Implementar paginación en endpoints de listado.

### Fase 3 — Modernización (3–6 meses)

- [ ] Migrar servidor HTTP a FastAPI (mantiene Python, agrega OpenAPI automático y validación con Pydantic).
- [ ] Adoptar Alembic para gestión formal de migraciones.
- [ ] Consolidar tablas `menudencias_*` en una sola tabla con columna `sucursal`.
- [ ] Implementar rate limiting y auditoría de accesos.

---

## 15. Glosario

| Término | Definición |
|---|---|
| Lote | Grupo de cabezas de ganado compradas en una misma operación |
| Faena | Proceso de sacrificio del ganado; registra cuántas cabezas fueron procesadas |
| Distribución | Envío de carne faenada a una sucursal específica |
| Recepción | Confirmación por parte de la sucursal de los kg y cabezas recibidas |
| Menudencias | Subproductos de la faena con menor valor (hígado, riñón, etc.) |
| Sucursal | Punto de venta/distribución: Luque, Areguá o Itauguá |
| Cerrado | Lote contabilizado y bloqueado para modificaciones |
| Slug | Identificador en URL de la sucursal: `luque`, `aregua`, `itaugua` |
| Flota | Conjunto de vehículos utilizados para la logística de distribución |
| Carga combustible | Registro de reabastecimiento de combustible de un vehículo |
