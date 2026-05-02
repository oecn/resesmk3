# PRD — Backend del Sistema de Gestión de Hacienda (Reces MK13)

**Versión:** 2.0  
**Fecha:** 2026-05-01  
**Estado:** Activo  
**Responsable técnico:** Equipo Reces MK13

---

## 1. Visión General

### 1.1 Propósito del sistema

El backend de Reces MK13 es la API central que soporta la operación diaria de un negocio de compra, faena y distribución de hacienda. Gestiona el flujo completo: desde la compra de lotes hasta la recepción física en sucursales, pasando por faena, distribución y análisis financiero. Adicionalmente administra la flota de vehículos, acuerdos comerciales con proveedores y un directorio de archivos/propiedades.

### 1.2 Problema que resuelve

Antes del sistema, el control operativo se realizaba en planillas Excel desconectadas, generando:
- Imposibilidad de conocer en tiempo real cuánto se distribuyó vs. lo faenado.
- Faltantes y sobrantes no trazados por sucursal.
- Sin costo/kg calculado automáticamente por lote.
- Control de flota y combustible no centralizado.
- Sin historial de recepción ni generación de PDFs operativos.
- Acuerdos comerciales con proveedores gestionados en papel sin trazabilidad de renovaciones.

### 1.3 Alcance actual (v2)

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
| Acuerdos comerciales con proveedores | Implementado |
| Archivos / directorio de propiedades | Implementado |
| Sistema de routing por módulos | Implementado |

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
    ├── config.py                   # Configuración global (DATABASE_URL, EMPRESAS, LOCALES)
    ├── dashboard_api.py            # Handler HTTP + Repository (monolítico, ~4675 líneas)
    ├── routing.py                  # Abstracción de routing: Router, Route, RequestContext
    ├── requirements.txt            # Dependencias pip
    ├── auth/
    │   ├── services/auth_service.py
    │   ├── repositories/auth_repository.py
    │   └── security/passwords.py
    ├── migrations/
    │   ├── 001_auth_schema.sql
    │   ├── 001_auth_schema.py
    │   ├── 002_usuario_sucursal.py
    │   ├── 003_flota_base.sql
    │   ├── 003_flota_base.py
    │   ├── 004_gastos_flota_proveedor_manual.py
    │   ├── 005_flota_vehiculos_incompletos.py
    │   ├── 006_flota_tipo_combustible.py
    │   ├── 007_lote_cerrado.py
    │   ├── 007_flota_facturas_unicas.py   # prefijo duplicado — ver sección 7
    │   ├── 008_sesiones_expiradas_cleanup.py
    │   ├── 009_menudencias_unificadas.py
    │   ├── 010_gastos_flota_soft_delete.py
    │   ├── 011_facturas_por_proveedor.py
    │   ├── 012_acuerdos_comerciales.py
    │   ├── 013_acuerdos_duracion_meses.py
    │   ├── 014_acuerdos_historial.py
    │   ├── 015_acuerdos_renovacion.py
    │   ├── 016_usuario_modulos_permitidos.py
    │   └── 017_archivos_propiedades.py
    └── modules/
        ├── __init__.py             # discover_routes() — autodescubrimiento de módulos
        └── README.md               # Contrato de registro de rutas
```

### 2.4 Sistema de routing por módulos

A partir de v2, los endpoints nuevos no editan `do_GET`/`do_POST`/... en `dashboard_api.py`. En cambio, se declaran en paquetes dentro de `modules/` que son autodescubiertos al arrancar el servidor.

#### `routing.py`

Define tres primitivas:

```python
@dataclass(frozen=True)
class RequestContext:
    handler: Any          # instancia de DashboardHandler
    parsed: Any           # resultado de urlparse(self.path)
    query: dict[str, list[str]]
    payload: dict[str, Any] | None = None   # None en GET/DELETE

@dataclass(frozen=True)
class Route:
    method: str
    path: str
    handler: RouteHandler
    name: str = ""
    def matches(self, method: str, path: str) -> bool: ...

class Router:
    def get/post/put/delete(self, path, handler, name=""): ...
    def match(self, method, path) -> Route | None: ...
    @property
    def routes(self) -> tuple[Route, ...]: ...
```

#### `modules/__init__.py` — `discover_routes()`

Al iniciar el servidor, `DashboardHandler.module_routes = discover_routes()` recorre todos los subpaquetes de `modules/` con `pkgutil.iter_modules`, importa su `routes.py` si existe, llama a `register_routes(router)` y acumula las rutas en una tupla inmutable.

Manejo de errores: si el propio `routes.py` de un módulo no existe (`ModuleNotFoundError` donde `exc.name == routes_module_name`), ese módulo se omite silenciosamente. Los errores de import transitivos (dependencias rotas) se re-lanzan.

#### Integración en `DashboardHandler`

- `do_GET`: `if self._dispatch_module_route("GET", parsed, query): return` — las rutas de módulo tienen prioridad sobre los if/elif del legacy handler.
- `do_POST`, `do_PUT`, `do_DELETE`: similar; el body se lee antes de despachar si existe al menos una ruta de módulo que coincida con el path.
- `_dispatch_module_route` retorna `True` cuando encontró y ejecutó la ruta (tanto en éxito como en excepción), para evitar que el legacy handler procese la misma request.

#### Contrato de un módulo nuevo

```
modules/nombre_modulo/
  __init__.py
  repository.py  # consultas SQL
  service.py     # reglas de negocio
  routes.py      # register_routes(router)
  schemas.py     # contratos de payload
```

Ejemplo mínimo de `routes.py`:

```python
def register_routes(router):
    router.get("/api/nombre-modulo/items", list_items)
    router.post("/api/nombre-modulo/items", save_item)

def list_items(ctx):
    ctx.handler._require_roles({"admin", "supervisor"})
    return {"items": []}
```

Si el handler retorna un valor distinto de `None`, el dispatcher lo envía como JSON con status 200. Para otro status o para PDF, el handler llama a `ctx.handler._send_json(...)` / `ctx.handler._send_pdf(...)` y retorna `None`.

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
| modulos_permitidos | JSONB NULL | Lista de módulos habilitados para el usuario |
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

### 3.4 Dominio: Acuerdos Comerciales

#### `acuerdos_proveedores`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| nombre | VARCHAR | Nombre del proveedor |
| ruc | VARCHAR NULL | |
| telefono | VARCHAR NULL | |
| activo | BOOLEAN DEFAULT TRUE | |
| creado_en | TIMESTAMP | |
| actualizado_en | TIMESTAMP | |

#### `acuerdos_comerciales`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| proveedor_id | FK → acuerdos_proveedores | |
| tipo_acuerdo | VARCHAR | Tipo de acuerdo comercial |
| descripcion | TEXT NULL | |
| fecha_inicio | DATE | |
| fecha_fin | DATE NULL | |
| duracion_meses | INTEGER NULL | Duración pactada en meses |
| monto | NUMERIC NULL | Valor del acuerdo (Gs.) |
| estado | VARCHAR | activo / vencido / cancelado |
| estado_renovacion | VARCHAR NULL | pendiente / renovado / no-renovar |
| acuerdo_origen_id | FK NULL → acuerdos_comerciales | Acuerdo que origina esta renovación |
| renovado_por_acuerdo_id | FK NULL → acuerdos_comerciales | Acuerdo que lo renovó |
| cambiado_por | VARCHAR NULL | Username que creó/modificó el registro |
| creado_en | TIMESTAMP | |
| actualizado_en | TIMESTAMP | |

#### `acuerdos_ubicaciones`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| acuerdo_id | FK → acuerdos_comerciales | |
| local | VARCHAR | Sucursal asociada |

#### `acuerdos_historial`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| acuerdo_id | FK → acuerdos_comerciales | |
| campo | VARCHAR | Campo que cambió |
| valor_anterior | TEXT NULL | |
| valor_nuevo | TEXT NULL | |
| cambiado_por | VARCHAR | Username |
| cambiado_en | TIMESTAMP | |

### 3.5 Dominio: Archivos / Propiedades

#### `archivos_propiedades`
| Columna | Tipo | Descripción |
|---|---|---|
| id | SERIAL PK | |
| local | TEXT | luque / aregua / itaugua / limpio / otro |
| local_otro | TEXT NULL | Nombre libre si `local = 'otro'` |
| otorgado_por | TEXT | Parte otorgante |
| a_favor_de | TEXT | Parte beneficiaria |
| monto | NUMERIC(18,2) NULL | Valor (Gs.) |
| cuenta_catastral | TEXT NULL | |
| numero_finca | TEXT NULL | |
| bibliorato | TEXT NULL | Archivador físico |
| mes_anho | TEXT NULL | Período de referencia |
| fecha | DATE NULL | |
| descripcion_ubicacion | TEXT NULL | |
| observaciones | TEXT NULL | |
| activo | BOOLEAN DEFAULT TRUE | |
| creado_en | TIMESTAMP | |
| actualizado_en | TIMESTAMP | |

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
{ "status": "ok", "timestamp": "2026-05-01T10:00:00" }
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

---

#### POST `/api/compras-faena/lotes`
Crea o edita un lote de compra. **Rol requerido:** `admin`, `supervisor`.

---

#### POST `/api/compras-faena/faenas`
Agrega un registro de faena a un lote. **Rol requerido:** `admin`, `supervisor`.

---

#### POST `/api/compras-faena/faena-total`
Ajusta directamente el total faenado del lote (override). **Rol requerido:** `admin`.

---

### 4.6 Distribuciones (`/api/distribuciones`)

#### GET `/api/distribuciones`
Lista lotes disponibles para distribuir con sus distribuciones actuales.

---

#### POST `/api/distribuciones`
Crea una nueva distribución. **Rol requerido:** `admin`, `supervisor`.

---

#### DELETE `/api/distribuciones`
Elimina una distribución. **Rol requerido:** `admin`, `supervisor`.  
**Query params:** `?id=9`  
**Error:** `403` si distribución ya fue recepcionada.

---

### 4.7 Recepción por Sucursal (`/api/recepcion/{slug}`)

`{slug}` = `luque` | `aregua` | `itaugua`

**Control de acceso:** rol `admin` y `supervisor` acceden a todas; rol `recepcion` solo a su `sucursal_permitida`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/recepcion/{slug}` | Distribuciones esperadas y estado de recepción |
| POST | `/api/recepcion/{slug}/distribuciones` | Registra/actualiza recepción de una distribución |
| GET | `/api/recepcion/{slug}/pdf` | PDF de recepción del día |
| POST | `/api/recepcion/{slug}/menudencias` | Agrega menudencia |
| PUT | `/api/recepcion/{slug}/menudencias` | Edita menudencia |
| DELETE | `/api/recepcion/{slug}/menudencias/{id}` | Elimina menudencia (admin/supervisor) |

---

### 4.8 Resúmenes Analíticos (`/api/resumenes`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/resumenes` | Listado analítico con métricas por lote |
| GET | `/api/resumenes/pdf` | PDF de lotes seleccionados (`?lote_ids=10,11`) |
| POST | `/api/resumenes/cerrar` | Marca lotes como cerrados (admin/supervisor) |

---

### 4.9 Flota

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/flota/catalogos` | Vehículos, proveedores, tipos de gasto |
| GET | `/api/flota/vehiculos` | Lista vehículos |
| POST | `/api/flota/vehiculos` | Crea/edita vehículo (admin) |
| PUT | `/api/flota/vehiculos/{id}` | Actualiza vehículo (admin) |
| POST | `/api/flota/proveedores` | Crea proveedor (admin) |
| PUT | `/api/flota/proveedores/{id}` | Actualiza proveedor (admin) |
| GET | `/api/flota/combustible` | Lista cargas de combustible |
| POST | `/api/flota/combustible` | Registra carga |
| POST | `/api/flota/combustible/eliminar` | Soft delete de carga (admin) |
| POST | `/api/flota/combustible/import/preview` | Preview importación Excel |
| POST | `/api/flota/combustible/import` | Confirma importación Excel |
| GET | `/api/flota/gastos` | Lista gastos |
| POST | `/api/flota/gastos` | Registra gasto |
| GET | `/api/flota/resumen-semanal` | Resumen combustible/gastos por semana |
| GET | `/api/flota/resumen-mensual/pdf` | PDF resumen mensual de flota |

---

### 4.10 Acuerdos Comerciales (`/api/acuerdos-comerciales`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/acuerdos-comerciales` | admin, supervisor | Lista acuerdos con proveedor, ubicaciones e historial |
| POST | `/api/acuerdos-comerciales` | admin, supervisor | Crea o edita un acuerdo; registra historial de cambios |
| GET | `/api/acuerdos-comerciales/proveedores` | admin, supervisor | Lista proveedores de acuerdos |
| POST | `/api/acuerdos-comerciales/proveedores` | admin | Crea proveedor de acuerdo |
| GET | `/api/acuerdos-comerciales/historial` | admin, supervisor | Historial de cambios de un acuerdo (`?acuerdo_id=N`) |
| GET | `/api/acuerdos-comerciales/historial-proveedor` | admin, supervisor | Historial de acuerdos de un proveedor (`?proveedor_id=N`) |

**Flujo de renovación:**
1. Acuerdo original tiene `estado_renovacion = 'pendiente'`.
2. POST crea nuevo acuerdo con `acuerdo_origen_id = <id_original>`.
3. El original recibe `renovado_por_acuerdo_id = <id_nuevo>` y `estado_renovacion = 'renovado'`.
4. El historial registra el campo `cambiado_por` con el username del operador.

---

### 4.11 Archivos / Directorio de Propiedades (`/api/archivos-directorio`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/archivos-directorio` | Todos | Lista propiedades con filtros opcionales |
| POST | `/api/archivos-directorio` | admin, supervisor | Crea o edita una propiedad |
| DELETE | `/api/archivos-directorio` | admin | Soft delete de una propiedad (`?id=N`) |

---

## 5. Seguridad

### 5.1 Autenticación

- **Mecanismo:** Cookie de sesión `rces_session` (HttpOnly, SameSite=Lax).
- **Token:** generado con `secrets.token_urlsafe(32)` — 43 caracteres URL-safe, 256 bits de entropía efectiva.
- **TTL de sesión:** 7 días desde creación.
- **Revocación:** Logout explícito marca `cerrada_en`. Expiración evaluada en cada request.

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
| Acuerdos comerciales (ver/editar) | ✓ | ✓ | — |
| Acuerdos comerciales (crear proveedor) | ✓ | — | — |
| Archivos / propiedades (ver) | ✓ | ✓ | ✓ |
| Archivos / propiedades (crear/editar) | ✓ | ✓ | — |
| Archivos / propiedades (eliminar) | ✓ | — | — |

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

Las migraciones se ejecutan manualmente en orden. No hay herramienta de migración automática.

| Migración | Descripción |
|---|---|
| `001_auth_schema` | Schema de autenticación + usuario admin inicial |
| `002_usuario_sucursal` | Columna `sucursal_permitida` en `usuarios` |
| `003_flota_base` | Tablas de flota (vehículos, proveedores, tipos_gasto, cargas, gastos) |
| `004_gastos_flota_proveedor_manual` | Campos manuales de proveedor en gastos |
| `005_flota_vehiculos_incompletos` | Ajustes a campos de vehículos |
| `006_flota_tipo_combustible` | Columna `tipo_combustible` en cargas |
| `007_lote_cerrado` | Columna `cerrado` en `lotes` |
| `007_flota_facturas_unicas` | ⚠ Prefijo duplicado — restricciones de unicidad en facturas de flota |
| `008_sesiones_expiradas_cleanup` | Limpieza de sesiones expiradas |
| `009_menudencias_unificadas` | Ajustes a tablas de menudencias por sucursal |
| `010_gastos_flota_soft_delete` | Soft delete en `cargas_combustible` (columnas `eliminado_*`) |
| `011_facturas_por_proveedor` | Restricciones de factura por proveedor en flota |
| `012_acuerdos_comerciales` | Tablas `acuerdos_proveedores`, `acuerdos_comerciales`, `acuerdos_ubicaciones` |
| `013_acuerdos_duracion_meses` | Columna `duracion_meses` en `acuerdos_comerciales` |
| `014_acuerdos_historial` | Tabla `acuerdos_historial` para auditoría de cambios |
| `015_acuerdos_renovacion` | Columnas `estado_renovacion`, `acuerdo_origen_id`, `renovado_por_acuerdo_id` |
| `016_usuario_modulos_permitidos` | Columna `modulos_permitidos` JSONB en `usuarios` |
| `017_archivos_propiedades` | Tabla `archivos_propiedades` + índice por local |

**Nota sobre prefijo duplicado:** Existen dos archivos con prefijo `007_`. Dado que la base de datos de producción es la misma instancia desde el inicio, ambas migraciones ya fueron aplicadas. Renombrar los archivos no es urgente pero sí conveniente al implementar un runner formal.

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
- El preview muestra filas con estado `ok: true` o mensaje de error por fila.

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
- **Lote cerrado**: Una vez marcado como `cerrado = true`, no se permiten modificaciones.
- **Eliminación de distribución**: Solo si la distribución no tiene recepción registrada en sucursal.

### 10.3 CTE de resúmenes

El endpoint `/api/resumenes` usa una CTE SQL que consolida en una sola query JOINs a `faenas` y `distribuciones`, calculando columnas derivadas (costo_kg, rendimiento_pct, pct_distribuido).

### 10.4 Formato numérico paraguayo

El parser de números acepta ambos formatos:
- ES: `1.200.500,75` → `1200500.75`
- EN: `1,200,500.75` → `1200500.75`

### 10.5 Cadena de renovación de acuerdos

Cuando se crea un acuerdo nuevo como renovación:
1. Se establece `acuerdo_origen_id` en el nuevo acuerdo.
2. El acuerdo original recibe `renovado_por_acuerdo_id` y `estado_renovacion = 'renovado'`.
3. Se registra una entrada en `acuerdos_historial` con el `cambiado_por` del operador.
4. Los estados posibles de `estado_renovacion`: `pendiente` / `renovado` / `no-renovar`.

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
| `dashboard_api.py` monolítico | ~4675 líneas en un solo archivo; módulos nuevos usan el sistema routing.py pero los dominios legacy siguen en el monolito | Dificulta mantenimiento, testing y onboarding |
| Sin pool de conexiones | Nueva conexión por request | Overhead de latencia en carga concurrente |
| Sesiones sin limpieza activa | Migración 008 agrega limpieza pero no hay job periódico ejecutándose | Degradación de performance en consultas de sesión |
| Sin logging estructurado | `print()` dispersos; `_dispatch_module_route` no loguea errores 500 de módulos | Imposible auditar en producción |

### 13.2 Media prioridad

| Ítem | Descripción |
|---|---|
| Sin framework de migraciones | No hay runner; migraciones se ejecutan manualmente; prefijo `007_` duplicado |
| Sin tests automatizados | Cualquier refactor requiere validación manual completa |
| URL backend hardcodeada en frontend | `192.168.10.12:8008` en `environment.ts` |
| Módulos legacy no migrados al sistema routing | `compras_faena`, `distribuciones`, `recepcion`, `resumenes`, `flota` siguen en `dashboard_api.py` |

### 13.3 Baja prioridad

| Ítem | Descripción |
|---|---|
| Sin framework HTTP | Migrar a FastAPI o Flask simplificaría routing y validación |
| Tablas menudencias por sucursal | 3 tablas idénticas → una tabla con columna `sucursal` |
| Sin paginación | Endpoints que retornan listas no paginadas |
| `Route.matches()` sin parámetros de URL | Solo comparación exacta de path; URLs dinámicas como `/api/recepcion/{slug}` siguen en el legacy |

---

## 14. Roadmap Propuesto

### Fase 1 — Estabilización

- [x] Implementar sistema de routing por módulos (`routing.py` + `discover_routes()`).
- [x] Módulo acuerdos comerciales con auditoría completa.
- [x] Módulo archivos/directorio de propiedades.
- [ ] Implementar job periódico de limpieza de sesiones expiradas.
- [ ] Agregar logging estructurado (JSON) con nivel configurable.
- [ ] Loguear errores 500 en `_dispatch_module_route`.
- [ ] Parametrizar puerto del servidor vía env var.
- [ ] Documentar procedimiento de backup de la base de datos.
- [ ] Implementar runner de migraciones y corregir prefijo `007_` duplicado.

### Fase 2 — Modularización

- [ ] Migrar dominios legacy (`compras_faena`, `distribuciones`, `recepcion`, `resumenes`, `flota`) al sistema de módulos.
- [ ] Introducir pool de conexiones (`psycopg2.pool.ThreadedConnectionPool`).
- [ ] Agregar tests de integración para flujos críticos (compra → faena → distribución → recepción).
- [ ] Implementar paginación en endpoints de listado.

### Fase 3 — Modernización

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
| Acuerdo comercial | Contrato con proveedor con fechas, montos y estado de renovación |
| Historial | Registro de auditoría de cambios en un acuerdo comercial |
| Módulo | Paquete Python en `modules/` que registra sus propias rutas HTTP vía `register_routes(router)` |
| RequestContext | Objeto inmutable pasado a handlers de módulo con acceso al handler HTTP, query params y payload |
