# PRD — Frontend del Sistema de Gestión de Hacienda (Reces MK13)

**Versión:** 2.0  
**Fecha:** 2026-05-01  
**Estado:** Activo  
**Responsable técnico:** Equipo Reces MK13

---

## 1. Visión General

### 1.1 Propósito

El frontend de Reces MK13 es una Single Page Application (SPA) Angular que provee la interfaz operativa completa para el control de compra, faena, distribución y recepción de hacienda, junto con la gestión de la flota vehicular, acuerdos comerciales y directorio de propiedades. Es el único punto de acceso de los usuarios al sistema.

### 1.2 Problema que resuelve

Proporciona a los distintos roles del negocio (administradores, supervisores y operarios de sucursal) una interfaz unificada que reemplaza el trabajo en planillas Excel desconectadas, permitiendo:
- Ver KPIs consolidados en tiempo real sin cruzar múltiples archivos.
- Registrar y consultar el ciclo completo de un lote (compra → faena → distribución → recepción) desde una sola aplicación.
- Controlar la recepción física por sucursal con generación de informes PDF.
- Gestionar la flota con registro de combustible, gastos y resúmenes por período.
- Consultar y renovar acuerdos comerciales con proveedores.
- Mantener un directorio de archivos y propiedades por sucursal.

### 1.3 Alcance actual (v2)

| Módulo | Ruta Angular | Estado |
|---|---|---|
| Autenticación | `/login` | Implementado (componente real) |
| Panel de control | `/dashboard` | Implementado (componente real) |
| Compras y Faena | `/compras-faena` | Implementado (placeholder pendiente migración) |
| Resúmenes analíticos | `/resumenes` | Implementado (placeholder pendiente migración) |
| Recepción por sucursal | `/recepcion` | Implementado (placeholder pendiente migración) |
| Distribuciones | `/distribuciones` | Implementado (placeholder pendiente migración) |
| Administración de usuarios | `/usuarios` | Implementado (componente real) |
| Flota (vehículos, combustible, gastos) | `/flota` | Implementado (placeholder pendiente migración) |
| Acuerdos comerciales | `/acuerdos-comerciales` | Implementado (componente real) |
| Archivos / directorio de propiedades | `/archivos-directorio` | Implementado (componente real) |
| Modo oscuro | global | Implementado |
| Responsive (tablet/mobile) | global | Implementado (parcial) |

---

## 2. Arquitectura Técnica

### 2.1 Stack

| Tecnología | Versión | Propósito |
|---|---|---|
| Angular | 17.3.0 | Framework SPA |
| TypeScript | ~5.4.5 | Lenguaje principal |
| RxJS | ~7.8.1 | Comunicación HTTP asíncrona |
| Angular Signals | 17.x | Estado reactivo local |
| Angular Standalone Components | 17.x | Sin NgModules |
| Angular Router | 17.x | Navegación por URL |
| Angular HttpClient | 17.x | Comunicación con API |
| Angular Forms (Template-Driven) | 17.x | Formularios con `ngModel` |

### 2.2 Modelo de despliegue

```
[Navegador del usuario]
        │  HTTP (Angular dev server o dist estática)
        ▼
[Angular SPA :4200]
        │  XHR + withCredentials (cookie automática)
        ▼
[Backend Python :8008]
```

- En desarrollo: `ng serve --host 0.0.0.0 --port 4200`
- En producción: archivos estáticos compilados en `dist/reces-dashboard/`
- URL de API configurada en `src/environments/environment.ts`

### 2.3 Estructura de archivos

```
web/frontend/
├── angular.json
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── index.html
    ├── styles.css
    ├── environments/
    │   └── environment.ts                   # apiUrl hardcodeada (ver deuda técnica)
    └── app/
        ├── app.component.ts                 # Componente raíz — sidebar, shell, lógica legacy
        ├── app.component.html               # Template principal
        ├── app.component.css                # Estilos globales del shell
        ├── app.routes.ts                    # Definición de rutas Angular Router
        ├── router-placeholder.component.ts  # Placeholder para rutas aún no migradas
        ├── core/
        │   ├── auth/
        │   │   ├── auth.service.ts          # login, logout, getCurrentUser, currentUser signal
        │   │   ├── auth.guard.ts            # authGuard — protege rutas con redirección a /login
        │   │   └── auth.models.ts           # CurrentUser interface
        │   └── http/
        │       └── api.service.ts           # HttpClient base con withCredentials
        ├── shared/
        │   └── pipes/
        │       ├── fmt-number.pipe.ts       # Pipe de formateo numérico (separadores ES)
        │       └── fmt-money.pipe.ts        # Pipe de formateo monetario (₲)
        └── features/
            ├── auth/
            │   ├── login/
            │   │   └── login.component.ts   # Formulario de credenciales (UI pura)
            │   └── login-page/
            │       └── login-page.component.ts  # Página de login — orquesta AuthService
            ├── dashboard/
            │   ├── dashboard.component.ts
            │   ├── dashboard.models.ts
            │   └── dashboard.service.ts
            ├── admin/
            │   └── users/
            │       ├── admin-users.component.ts
            │       ├── admin-users.models.ts
            │       └── admin-users.service.ts
            ├── acuerdos-comerciales/
            │   ├── acuerdos-comerciales.component.ts
            │   ├── acuerdos-comerciales.models.ts
            │   └── acuerdos-comerciales.service.ts
            ├── archivos-directorio/
            │   ├── archivos-directorio.component.ts
            │   ├── archivos-directorio.models.ts
            │   └── archivos-directorio.service.ts
            ├── operaciones/
            │   ├── compras-faena/
            │   │   ├── compras-faena.models.ts
            │   │   └── compras-faena.service.ts
            │   ├── distribuciones/
            │   │   ├── distribuciones.models.ts
            │   │   └── distribuciones.service.ts
            │   └── recepcion/
            │       ├── recepcion.models.ts
            │       └── recepcion.service.ts
            ├── resumenes/
            │   ├── resumenes.models.ts
            │   └── resumenes.service.ts
            └── flota/
                ├── flota.models.ts
                └── flota.service.ts
```

### 2.4 Rutas Angular Router

```typescript
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginPageComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'compras-faena', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'resumenes', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'recepcion', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'distribuciones', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'usuarios', component: AdminUsersComponent, canActivate: [authGuard] },
  { path: 'flota', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'acuerdos-comerciales', component: AcuerdosComercialesComponent, canActivate: [authGuard] },
  { path: 'archivos-directorio', component: ArchivosDirectorioComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
```

Rutas con componente real: `login`, `dashboard`, `usuarios`, `acuerdos-comerciales`, `archivos-directorio`.  
Rutas con `RouterPlaceholderComponent`: `compras-faena`, `resumenes`, `recepcion`, `distribuciones`, `flota` — la lógica sigue en `AppComponent` mientras se completa la migración.

### 2.5 Auth Guard

`authGuard` es una función guard de Angular Router. Al activar una ruta protegida:
1. Comprueba `AuthService.currentUserSnapshot()` (sin HTTP si ya hay sesión cacheada).
2. Si no hay sesión en memoria, llama `GET /api/auth/me`.
3. Si el backend responde 401, redirige a `/login`.

Esto permite restaurar sesión al navegar directamente a una URL protegida (refrescar página).

### 2.6 Configuración de entorno

```typescript
// src/environments/environment.ts
export const environment = {
  apiUrl: 'http://192.168.10.12:8008/api',  // IP hardcodeada — requiere parametrización
};
```

### 2.7 Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Dev server en `0.0.0.0:4200` (accesible desde red LAN) |
| `npm run build` | Build de producción en `dist/` |

---

## 3. Patrones de Diseño

### 3.1 Arquitectura por features

La aplicación usa el patrón **feature-first**: cada dominio vive en `features/<nombre>/` con su propio componente, servicio y modelos. Los componentes son standalone (sin NgModules).

Flujo de datos por feature:
```
Backend API
    │
    ▼
<Feature>Service (HttpClient via ApiService)
    │
    ▼
<Feature>Component.signal()  ←→  computed()  →  Template HTML
```

### 3.2 Capa Core

`core/` contiene código de infraestructura transversal:
- `auth/auth.service.ts`: gestión de sesión, signal `currentUser`.
- `auth/auth.guard.ts`: protección de rutas.
- `auth/auth.models.ts`: `CurrentUser` interface.
- `http/api.service.ts`: base HttpClient con `withCredentials: true`.

### 3.3 Shared

`shared/pipes/` contiene pipes reutilizables: `FmtNumberPipe` (separadores de miles) y `FmtMoneyPipe` (₲).

### 3.4 Gestión de estado con Signals

Todo el estado de UI se maneja con `signal()` y `computed()`. No hay store externo (Redux, NgRx, etc.).

### 3.5 Template-Driven Forms

Los formularios usan `[(ngModel)]` para binding bidireccional. No se usa Reactive Forms.

### 3.6 Estado de migración

`AppComponent` aún contiene la lógica completa para los módulos legacy (compras-faena, distribuciones, recepción, resúmenes, flota). Los módulos nuevos (dashboard, usuarios, acuerdos-comerciales, archivos-directorio, login) ya están extraídos como componentes independientes. La migración es incremental.

---

## 4. Tipos e Interfaces TypeScript

### 4.1 Tipos de navegación

```typescript
type AppView = 'dashboard' | 'compras-faena' | 'resumenes' | 'recepcion'
             | 'distribuciones' | 'usuarios' | 'flota'
             | 'acuerdos-comerciales' | 'archivos-directorio'

type FlotaSection = 'resumen' | 'vehiculos' | 'combustible' | 'gastos'
type RecepcionSucursalSlug = 'aregua' | 'luque' | 'itaugua'
type PropiedadLocal = 'luque' | 'aregua' | 'itaugua' | 'limpio' | 'otro'
```

### 4.2 Core: Usuario autenticado

```typescript
// core/auth/auth.models.ts
interface CurrentUser {
  id: number
  username: string
  nombre: string
  rol: 'admin' | 'supervisor' | 'recepcion'
  sucursal_permitida: RecepcionSucursalSlug | null
}
```

### 4.3 Feature: Dashboard

```typescript
interface ResumenKpis {
  total_lotes: number
  total_cabezas: number
  total_kg_distribuidos: number
  total_monto: number
  costo_kg_promedio: number
}

interface CompraEmpresa { empresa: string; lotes: number; cabezas: number; monto: number }
interface DistribucionLocal { local: string; kg: number; cabezas: number }
interface MenudenciaSucursal { sucursal: string; producto: string; kg: number; unidades: number }
interface TopMenudencia { producto: string; kg_total: number }
interface MenudenciaProductoSucursal {
  producto: string; aregua_kg: number; luque_kg: number; itaugua_kg: number; total_kg: number
}

interface DashboardData {
  resumen: ResumenKpis
  compras_por_empresa: CompraEmpresa[]
  distribuciones_por_local: DistribucionLocal[]
  menudencias: MenudenciaSucursal[]
  top_menudencias: TopMenudencia[]
  menudencias_por_producto: MenudenciaProductoSucursal[]
}
```

### 4.4 Feature: Acuerdos Comerciales

```typescript
interface ProveedorComercial {
  id: number
  nombre: string
  ruc: string | null
  telefono: string | null
  activo: boolean
}

interface AcuerdoUbicacion {
  id: number
  acuerdo_id: number
  local: string
}

interface AcuerdoHistorial {
  id: number
  acuerdo_id: number
  campo: string
  valor_anterior: string | null
  valor_nuevo: string | null
  cambiado_por: string
  cambiado_en: string
}

interface AcuerdoComercial {
  id: number
  proveedor_id: number
  proveedor_nombre: string
  tipo_acuerdo: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string | null
  duracion_meses: number | null
  monto: number | null
  estado: 'activo' | 'vencido' | 'cancelado'
  estado_renovacion: 'pendiente' | 'renovado' | 'no-renovar' | null
  acuerdo_origen_id: number | null
  renovado_por_acuerdo_id: number | null
  ubicaciones: AcuerdoUbicacion[]
  historial: AcuerdoHistorial[]
}

interface AcuerdoComercialPayload {
  id?: number
  proveedor_id: number
  tipo_acuerdo: string
  descripcion?: string
  fecha_inicio: string
  fecha_fin?: string
  duracion_meses?: number
  monto?: number
  estado: string
  estado_renovacion?: string
  acuerdo_origen_id?: number
  ubicaciones?: string[]
}
```

### 4.5 Feature: Archivos / Propiedades

```typescript
interface ArchivoPropiedad {
  id?: number | null
  local: PropiedadLocal
  local_otro?: string | null
  otorgado_por: string
  a_favor_de: string
  monto?: number | string | null
  cuenta_catastral?: string | null
  numero_finca?: string | null
  bibliorato?: string | null
  mes_anho?: string | null
  fecha?: string | null
  descripcion_ubicacion?: string | null
  observaciones?: string | null
  creado_en?: string | null
  actualizado_en?: string | null
}

interface ArchivosPropiedadesData {
  items: ArchivoPropiedad[]
  locales: PropiedadLocal[]
  biblioratos: string[]
}
```

### 4.6 Feature: Admin Users

```typescript
interface AdminUser {
  id: number
  username: string
  nombre: string
  rol: string
  activo: boolean
  sucursal_permitida: string | null
  ultimo_login: string | null
}

interface AdminUsersData {
  usuarios: AdminUser[]
  roles: { id: number; nombre: string }[]
}
```

### 4.7 Interfaces de Recepción

```typescript
interface RecepcionDistribucion {
  id: number; lote: string; empresa: string
  kg_enviado: number; cabezas_enviadas: number
  kg_recibido: number | null; diferencia_kg: number | null
  nota_recepcion: string | null; fecha: string
}

interface RecepcionMenudencia {
  id: number; producto: string; kg: number; unidades: number; fecha: string
}

interface RecepcionData {
  slug: string; fecha: string
  distribuciones: RecepcionDistribucion[]
  menudencias: RecepcionMenudencia[]
  resumen: { total_enviado_kg: number; total_recibido_kg: number; diferencia_total_kg: number }
}
```

### 4.8 Interfaces de Distribuciones

```typescript
interface DistribucionRow {
  id: number; local: string; fecha: string
  kg: number; cabezas: number; nota: string; diferencia_kg: number | null
}

interface DistribucionLote {
  id: number; lote: string; empresa: string
  faenado: number; distribuido_kg: number; distribuido_cabezas: number; saldo_cabezas: number
  distribuciones: DistribucionRow[]
  resumen_por_local: { local: string; kg_total: number; cabezas_total: number }[]
}
```

### 4.9 Interfaces de Compras y Faena

```typescript
interface CompraFaenaLote {
  id: number; lote: string; empresa: string; fecha: string
  cantidad: number; monto: number; peso_compra_kg: number; cerrado: boolean
  faenas: { id: number; cantidad: number; fecha: string; nota: string }[]
  total_faenado: number
}
```

### 4.10 Interfaces de Resúmenes

```typescript
interface LoteResumen {
  id: number; lote: string; empresa: string; fecha: string
  cantidad: number; monto: number; peso_compra_kg: number
  total_faenado: number; kg_distribuidos: number; cabezas_distribuidas: number
  costo_kg: number; rendimiento_pct: number; pct_distribuido: number; cerrado: boolean
}
```

### 4.11 Interfaces de Flota

```typescript
interface FlotaVehiculo {
  id: number; codigo: string; nombre: string; chapa: string
  marca: string; modelo: string; anho: number; tipo: string
  sucursal: string; chofer: string; activo: boolean
}

interface FlotaCombustibleRow {
  id: number; vehiculo_id: number; vehiculo_nombre: string; fecha: string
  proveedor_nombre: string; litros: number; importe: number; precio_litro: number
  tipo_combustible: string; km_actual: number; nro_factura: string; cargado_por: string
}

interface FlotaResumenSemanalData {
  semana: number; anho: number; fecha_inicio: string; fecha_fin: string
  por_vehiculo: FlotaResumenRow[]
  por_sucursal: FlotaResumenSucursalRow[]
  comparativo_semanas: { semana: number; total_combustible: number; total_gastos: number }[]
  ranking_costo_por_km: { vehiculo_nombre: string; costo_por_km: number }[]
}
```

---

## 5. Componentes Implementados

### 5.1 `LoginPageComponent` — `/login`

Página de login. Orquesta `AuthService.login()`.

- `ngOnInit`: si `AuthService.currentUserSnapshot()` no es null, redirige a `/dashboard` (`replaceUrl: true`).
- Al hacer login exitoso: limpia la contraseña y navega a `/dashboard`.
- Mensajes de error por código HTTP: 0 (sin conexión), 401 (credenciales), 403 (sin permiso), 5xx (error servidor).
- Delega el formulario visual a `LoginComponent` (UI pura, sin lógica de negocio).

### 5.2 `DashboardComponent` — `/dashboard`

Dashboard de KPIs. Self-contained, ~195 líneas.

- Carga datos via `DashboardService.getDashboard(desde, hasta)`.
- KPIs configurables: el usuario puede mostrar/ocultar cada KPI; preferencia persiste en `localStorage`.
- Selectores de período predefinidos: mes-actual, mes-anterior, trimestre, año.
- `computed()` para valores máximos de barras de distribución y menudencias.

### 5.3 `AdminUsersComponent` — `/usuarios`

CRUD de usuarios. Self-contained, ~147 líneas.

- Lista usuarios y roles vía `AdminUsersService`.
- Formulario de creación/edición con campo `sucursal_permitida` visible solo cuando `rol === 'recepcion'`.
- Flujo separado para cambio de contraseña (modal inline).

### 5.4 `AcuerdosComercialesComponent` — `/acuerdos-comerciales`

Gestión de acuerdos comerciales con proveedores. 4 pestañas:
1. **Lista de acuerdos** — filtros por estado, proveedor, tipo.
2. **Formulario crear/editar acuerdo** — incluye renovación (genera nuevo acuerdo vinculado al original).
3. **Proveedores** — CRUD de proveedores de acuerdos.
4. **Historial** — auditoría de cambios por acuerdo.

### 5.5 `ArchivosDirectorioComponent` — `/archivos-directorio`

Directorio de propiedades por sucursal.

- Filtros: búsqueda libre, filtro por local.
- Formulario inline de creación/edición.
- Campos: local, otorgado_por, a_favor_de, monto, cuenta_catastral, número_finca, bibliorato, mes_anho, fecha, descripción_ubicación, observaciones.

### 5.6 `RouterPlaceholderComponent`

Componente vacío utilizado como placeholder para las rutas aún no extraídas de `AppComponent`: `compras-faena`, `resumenes`, `recepcion`, `distribuciones`, `flota`. La navegación a estas rutas activa `AppComponent` para renderizar el contenido legacy correspondiente.

---

## 6. Servicios por Feature

| Servicio | Ubicación | Endpoints que consume |
|---|---|---|
| `AuthService` | `core/auth/` | `/auth/login`, `/auth/logout`, `/auth/me` |
| `DashboardService` | `features/dashboard/` | `/dashboard` |
| `AdminUsersService` | `features/admin/users/` | `/auth/users` |
| `AcuerdosComercialesService` | `features/acuerdos-comerciales/` | `/acuerdos-comerciales/*` |
| `ArchivosDirectorioService` | `features/archivos-directorio/` | `/archivos-directorio` |
| `ComprasFaenaService` | `features/operaciones/compras-faena/` | `/compras-faena/*` |
| `DistribucionesService` | `features/operaciones/distribuciones/` | `/distribuciones` |
| `RecepcionService` | `features/operaciones/recepcion/` | `/recepcion/*` |
| `ResumenesService` | `features/resumenes/` | `/resumenes/*` |
| `FlotaService` | `features/flota/` | `/flota/*` |

Todos los servicios usan `withCredentials: true` para incluir la cookie de sesión.

---

## 7. Autorización en Frontend

> **Importante:** El control de acceso en el frontend es de UX (oculta elementos). La seguridad real está en el backend.

### 7.1 authGuard

Protege todas las rutas excepto `/login`. Si no hay sesión activa, redirige a `/login` preservando la URL solicitada.

### 7.2 Restricciones de navegación por rol

- Rol `recepcion`: la barra de navegación solo muestra `recepcion` y `flota`.
- Rol `admin`/`supervisor`: acceso completo (incluyendo `usuarios`, `acuerdos-comerciales`, `archivos-directorio`).

### 7.3 Sidebar dinámico

| Ítem de menú | Roles con acceso |
|---|---|
| Dashboard | admin, supervisor |
| Compras-Faena | admin, supervisor |
| Distribuciones | admin, supervisor |
| Resúmenes | admin, supervisor |
| Recepción | todos |
| Flota | todos |
| Acuerdos Comerciales | admin, supervisor |
| Archivos / Directorio | admin, supervisor |
| Usuarios | admin |

---

## 8. Vistas — Módulos Legacy en AppComponent

Los siguientes módulos siguen renderizándose dentro de `AppComponent` mientras se completa su extracción a componentes independientes.

### 8.1 Compras y Faena

- Lista de lotes con filtros (búsqueda, rango de fechas, empresa).
- Formulario inline: crear/editar lote, registrar faena, ajustar faena.
- `buildLoteCode()` genera código de lote automáticamente; el usuario puede overridear.

### 8.2 Distribuciones

- Layout de dos paneles: lista de lotes + detalle de distribuciones del lote seleccionado.
- Indicadores por lote: faenado vs. distribuido, saldo de cabezas, barra de progreso.
- Modal para editar distribuciones existentes.

### 8.3 Recepción por Sucursal

- Selector de sucursal (bloqueado para rol `recepcion` a su sucursal asignada).
- Formulario de recepción inline: kg recibidos y nota por distribución.
- CRUD de menudencias del día.
- Descarga PDF de recepción.

### 8.4 Resúmenes Analíticos

- Tabla de lotes con métricas calculadas: costo/kg, rendimiento, % distribuido.
- Selección múltiple para cerrar lotes o generar PDF.
- Filtros: estado abierto/cerrado, empresa, rango de fechas, búsqueda libre.

### 8.5 Flota

Cuatro secciones internas (`FlotaSection`):
- **Resumen**: tablas semanales/mensuales de combustible y gastos; PDF mensual.
- **Vehículos**: CRUD de vehículos y proveedores.
- **Combustible**: registro de cargas; importación desde Excel (preview → confirm).
- **Gastos**: registro de gastos con tipo, importe y proveedor.

---

## 9. Sistema de Diseño

### 9.1 Layout

- **Max-width:** 1440px centrado
- **Sidebar:** fijo a la izquierda, colapsable
- **Content:** `calc(100% - sidebar-width)` con scroll interno

### 9.2 Paleta de colores (modo claro)

| Token CSS | Valor | Uso |
|---|---|---|
| `--color-primary` | `#2563eb` | Botones primarios, links activos |
| `--color-success` | `#16a34a` | Mensajes OK, lotes cerrados |
| `--color-danger` | `#dc2626` | Errores, diferencias negativas |
| `--color-warning` | `#d97706` | Alertas, pendientes |
| `--color-surface` | `#ffffff` | Paneles |
| `--color-bg` | `#f8fafc` | Fondo general |
| `--color-border` | `#e2e8f0` | Bordes de tablas y paneles |
| `--color-text` | `#1e293b` | Texto principal |
| `--color-text-muted` | `#64748b` | Texto secundario |

### 9.3 Modo oscuro

- Activado con `.dark-mode` en el elemento raíz.
- La preferencia se persiste en `localStorage`.

### 9.4 Tipografía

- Fuente base: sistema (sans-serif de la plataforma).
- Escala modular: 12px, 14px (base), 16px, 18px, 24px.
- Monospace para números financieros en tablas.

### 9.5 Componentes de UI reutilizados (sin componente separado)

| Patrón | Descripción |
|---|---|
| `.panel` | Tarjeta blanca con borde y sombra |
| `.kpi-card` | Tarjeta de indicador con valor grande |
| `.table-wrap` | Contenedor de tabla con scroll horizontal |
| `.form-grid` | Grid de 2-3 columnas para formularios |
| `.bar-track` / `.bar-fill` | Barra de progreso inline |
| Modal backdrop | Overlay oscuro + panel central |

### 9.6 Responsive

| Breakpoint | Comportamiento |
|---|---|
| > 1100px | Layout completo sidebar + content |
| ≤ 1100px | Sidebar colapsable por defecto |
| ≤ 860px | Formularios en una columna |
| ≤ 760px | KPI grid a 2 columnas |

---

## 10. Funcionalidades Transversales

### 10.1 Modo oscuro

`toggleDarkMode()` aplica clase `.dark-mode` al `document.body` y persiste en `localStorage`.

### 10.2 Preferencias de KPIs

El usuario puede mostrar/ocultar KPIs del dashboard. Las preferencias se guardan en `localStorage`.

### 10.3 Pipes de formateo

| Pipe | Descripción |
|---|---|
| `FmtNumberPipe` | Separadores de miles y decimales (locale ES) |
| `FmtMoneyPipe` | Moneda en Guaraníes: "₲ 1.500.000" |

### 10.4 Formateo de fechas (en AppComponent)

| Método | Descripción |
|---|---|
| `toIsoDate(d)` | Convierte `Date` a `YYYY-MM-DD` |
| `formatHumanDate(iso)` | `YYYY-MM-DD` → texto legible (ej. "23 abr") |
| `getIsoWeekFromDate(d)` | Número de semana ISO |

### 10.5 Descarga de PDFs

El servicio retorna `Blob`. El frontend crea `URL.createObjectURL(blob)`, abre con `window.open()` y libera con `URL.revokeObjectURL()`.

---

## 11. Requisitos No Funcionales

| Requisito | Valor objetivo |
|---|---|
| Tiempo de carga inicial (bundle) | < 3 segundos en LAN |
| Budget Angular bundle (warning) | 500 KB |
| Budget Angular bundle (error) | 1 MB |
| Navegadores objetivo | Chrome / Edge modernos (Chromium-based) |
| Modo de uso | Interno, red LAN, resoluciones ≥ 1366×768 |

---

## 12. Deuda Técnica Documentada

### 12.1 Alta prioridad

| Ítem | Descripción | Impacto |
|---|---|---|
| `AppComponent` aún monolítico para módulos legacy | Los módulos compras-faena, distribuciones, recepción, resúmenes y flota siguen en `AppComponent` | Dificulta testing y mantenimiento de esos módulos |
| `RouterPlaceholderComponent` en 5 rutas | Las rutas legacy no tienen componente real todavía | Navegación directa por URL no renderiza contenido hasta que AppComponent lo active |
| URL backend hardcodeada | `192.168.10.12:8008` en `environment.ts` | Cambiar de servidor requiere rebuild del frontend |

### 12.2 Media prioridad

| Ítem | Descripción |
|---|---|
| Sin tests unitarios ni e2e | Cualquier refactor requiere validación manual completa |
| Template-Driven Forms en formularios complejos | Validación más difícil que Reactive Forms |
| Sin manejo centralizado de errores 401 | No hay interceptor HTTP global; cada componente maneja el 401 por separado |
| Formularios sin validación client-side | Campos requeridos y rangos no se validan antes de enviar |
| Lógica de fechas manual en AppComponent | `getIsoWeekFromDate`, etc. podrían reemplazarse con date-fns |

### 12.3 Baja prioridad

| Ítem | Descripción |
|---|---|
| Sin lazy loading | Todas las rutas cargan en el bundle inicial |
| Sin paginación en tablas | Listas largas se renderizan completas |
| Sin i18n formal | Textos hardcodeados en español |

---

## 13. Roadmap Propuesto

### Fase 1 — Completada / En progreso

- [x] Implementar Angular Router con rutas reales.
- [x] Extraer `LoginPageComponent` como componente standalone con `authGuard`.
- [x] Extraer `DashboardComponent` como componente standalone con servicio y modelos propios.
- [x] Extraer `AdminUsersComponent` como componente standalone.
- [x] Extraer `AcuerdosComercialesComponent` como componente standalone.
- [x] Extraer `ArchivosDirectorioComponent` como componente standalone.
- [x] Crear capa `core/` para auth y `shared/` para pipes.
- [x] Separar servicios por feature en `features/`.
- [ ] Parametrizar `apiUrl` via variable de entorno en el build.
- [ ] Agregar interceptor HTTP para manejar `401` globalmente.
- [ ] Validación básica client-side en formularios críticos.

### Fase 2 — Migración de módulos legacy

- [ ] Extraer `ComprasFaenaComponent` standalone con su propio template y servicio.
- [ ] Extraer `DistribucionesComponent` standalone.
- [ ] Extraer `RecepcionComponent` standalone.
- [ ] Extraer `ResumenesComponent` standalone.
- [ ] Extraer `FlotaComponent` standalone con sus 4 sub-secciones.
- [ ] Reemplazar `RouterPlaceholderComponent` con los componentes reales en todas las rutas.
- [ ] Migrar formularios de alta complejidad a Reactive Forms con validadores.
- [ ] Implementar interceptor HTTP global para manejo centralizado de errores.

### Fase 3 — Modernización

- [ ] Agregar tests unitarios por componente con Jest o Karma.
- [ ] Implementar paginación del lado cliente en tablas largas.
- [ ] Reemplazar utilidades de fecha manuales con `date-fns` o `@angular/common` pipes.
- [ ] Implementar lazy loading por módulo para reducir bundle inicial.
- [ ] Mejorar accesibilidad: ARIA labels, navegación por teclado.

---

## 14. Glosario

| Término | Definición |
|---|---|
| SPA | Single Page Application — la app carga una vez y navega sin recargar la página |
| Signal | Primitiva reactiva de Angular 17+ que notifica automáticamente a la vista cuando cambia |
| Computed Signal | Valor derivado de otros signals, recalculado automáticamente |
| Standalone Component | Componente Angular 17+ sin NgModule, con imports directos |
| Template-Driven Form | Formulario Angular donde el binding se declara en el HTML con `[(ngModel)]` |
| `withCredentials` | Flag HTTP que indica al navegador incluir las cookies en requests cross-origin |
| AppView | Tipo unión que identifica la vista activa en la aplicación |
| authGuard | Guard de Angular Router que verifica sesión activa antes de activar una ruta |
| Feature | Módulo funcional auto-contenido en `features/<nombre>/` con componente, servicio y modelos propios |
| RouterPlaceholderComponent | Componente vacío que ocupa una ruta hasta que el módulo legacy sea extraído |
| FlotaSection | Sub-sección dentro de la vista de flota |
| Slug | Identificador en URL de la sucursal: `luque`, `aregua`, `itaugua` |
| KPI | Key Performance Indicator — indicador clave de desempeño mostrado en tarjetas del dashboard |
| PDF Blob | Archivo PDF recibido del backend como datos binarios y abierto directamente en el navegador |
| Acuerdo comercial | Contrato con proveedor gestionado en la vista `/acuerdos-comerciales` |
| Propiedad | Registro de archivo/documento de una propiedad inmobiliaria gestionado en `/archivos-directorio` |
