# PRD — Frontend del Sistema de Gestión de Hacienda (Reces MK13)

**Versión:** 1.0  
**Fecha:** 2026-04-23  
**Estado:** Borrador  
**Responsable técnico:** Equipo Reces MK13

---

## 1. Visión General

### 1.1 Propósito

El frontend de Reces MK13 es una Single Page Application (SPA) Angular que provee la interfaz operativa completa para el control de compra, faena, distribución y recepción de hacienda, junto con la gestión de la flota vehicular. Es el único punto de acceso de los usuarios al sistema.

### 1.2 Problema que resuelve

Proporciona a los distintos roles del negocio (administradores, supervisores y operarios de sucursal) una interfaz unificada que reemplaza el trabajo en planillas Excel desconectadas, permitiendo:
- Ver KPIs consolidados en tiempo real sin cruzar múltiples archivos.
- Registrar y consultar el ciclo completo de un lote (compra → faena → distribución → recepción) desde una sola aplicación.
- Controlar la recepción física por sucursal con generación de informes PDF.
- Gestionar la flota con registro de combustible, gastos y resúmenes por período.

### 1.3 Alcance actual (v1)

| Módulo | Vista | Estado |
|---|---|---|
| Autenticación | Login | Implementado |
| Panel de control | Dashboard | Implementado |
| Compras y Faena | compras-faena | Implementado |
| Resúmenes analíticos | resumenes | Implementado |
| Recepción por sucursal | recepcion | Implementado |
| Distribuciones | distribuciones | Implementado |
| Administración de usuarios | usuarios | Implementado |
| Flota (vehículos, combustible, gastos) | flota | Implementado |
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
├── angular.json                          # Configuración del workspace Angular
├── package.json                          # Dependencias npm
├── tsconfig.json                         # Configuración TypeScript
├── src/
│   ├── main.ts                           # Bootstrap de la aplicación
│   ├── index.html                        # HTML raíz
│   ├── styles.css                        # Estilos globales
│   ├── environments/
│   │   └── environment.ts                # URL del backend (apiUrl)
│   └── app/
│       ├── app.component.ts              # Componente raíz (~2819 líneas)
│       ├── app.component.html            # Template principal (~2153 líneas)
│       ├── app.component.css             # Estilos del componente (~2137 líneas)
│       └── services/
│           └── dashboard.service.ts      # Gateway HTTP centralizado
└── dist/
    └── reces-dashboard/                  # Build de producción compilado
```

### 2.4 Configuración de entorno

```typescript
// src/environments/environment.ts
export const environment = {
  apiUrl: 'http://192.168.10.12:8008/api',  // IP hardcodeada — requiere parametrización
};
```

### 2.5 Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Dev server en `0.0.0.0:4200` (accesible desde red LAN) |
| `npm run build` | Build de producción en `dist/` |

---

## 3. Patrones de Diseño

### 3.1 Componente monolítico

La aplicación usa un **único componente raíz** (`AppComponent`) que contiene toda la lógica de la UI, estado y navegación. No hay componentes hijos, rutas de Angular Router, ni módulos adicionales. Este diseño es pragmático para la escala actual pero constituye deuda técnica.

### 3.2 Gestión de estado con Signals

Todo el estado de la UI se maneja con **Angular Signals** (`signal()`) y valores derivados con **Computed Signals** (`computed()`). No hay store externo (Redux, NgRx, etc.).

Flujo de datos:
```
Backend API
    │
    ▼
DashboardService (HttpClient)
    │
    ▼
AppComponent.signal()  ←→  computed()  →  Template HTML
```

### 3.3 Template-Driven Forms

Los formularios usan `[(ngModel)]` para binding bidireccional de campos con propiedades del componente. No se usa Reactive Forms.

### 3.4 Gateway de servicio

`DashboardService` centraliza toda la comunicación HTTP: construye URLs, adjunta parámetros, fuerza `withCredentials: true` para enviar la cookie de sesión automáticamente.

---

## 4. Tipos e Interfaces TypeScript

### 4.1 Tipos de navegación

```typescript
type AppView = 'dashboard' | 'compras-faena' | 'resumenes' | 'recepcion' | 'distribuciones' | 'usuarios' | 'flota'
type FlotaSection = 'resumen' | 'vehiculos' | 'combustible' | 'gastos'
type RecepcionSucursalSlug = 'aregua' | 'luque' | 'itaugua'
type OptionalKpiKey = 'lotes' | 'reces_compradas' | 'reces_faenadas' | 'reces_distribuidas' | 'kg_distribuidos' | 'monto_total' | 'costo_kg_promedio'
```

### 4.2 Interfaces de dominio (Dashboard)

```typescript
interface CurrentUser {
  id: number
  username: string
  nombre: string
  rol: 'admin' | 'supervisor' | 'recepcion'
  sucursal_permitida: RecepcionSucursalSlug | null
}

interface ResumenKpis {
  total_lotes: number
  total_cabezas: number
  total_kg_distribuidos: number
  total_monto: number
  costo_kg_promedio: number
}

interface CompraEmpresa {
  empresa: string
  lotes: number
  cabezas: number
  monto: number
}

interface DistribucionLocal {
  local: string
  kg: number
  cabezas: number
}

interface MenudenciaSucursal {
  sucursal: string
  producto: string
  kg: number
  unidades: number
}

interface TopMenudencia {
  producto: string
  kg_total: number
}

interface MenudenciaProductoSucursal {
  producto: string
  aregua_kg: number
  luque_kg: number
  itaugua_kg: number
  total_kg: number
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

### 4.3 Interfaces de Recepción

```typescript
interface RecepcionDistribucion {
  id: number
  lote: string
  empresa: string
  kg_enviado: number
  cabezas_enviadas: number
  kg_recibido: number | null
  diferencia_kg: number | null
  nota_recepcion: string | null
  fecha: string
}

interface RecepcionMenudencia {
  id: number
  producto: string
  kg: number
  unidades: number
  fecha: string
}

interface RecepcionData {
  slug: string
  fecha: string
  distribuciones: RecepcionDistribucion[]
  menudencias: RecepcionMenudencia[]
  resumen: {
    total_enviado_kg: number
    total_recibido_kg: number
    diferencia_total_kg: number
  }
}
```

### 4.4 Interfaces de Distribuciones

```typescript
interface DistribucionRow {
  id: number
  local: string
  fecha: string
  kg: number
  cabezas: number
  nota: string
  diferencia_kg: number | null
}

interface DistribucionResumenLocal {
  local: string
  kg_total: number
  cabezas_total: number
}

interface DistribucionLote {
  id: number
  lote: string
  empresa: string
  faenado: number
  distribuido_kg: number
  distribuido_cabezas: number
  saldo_cabezas: number
  distribuciones: DistribucionRow[]
  resumen_por_local: DistribucionResumenLocal[]
}

interface DistribucionesData {
  lotes: DistribucionLote[]
}
```

### 4.5 Interfaces de Compras y Faena

```typescript
interface CompraFaenaRow {
  id: number
  cantidad: number
  fecha: string
  nota: string
}

interface CompraFaenaLote {
  id: number
  lote: string
  empresa: string
  fecha: string
  cantidad: number
  monto: number
  peso_compra_kg: number
  cerrado: boolean
  faenas: CompraFaenaRow[]
  total_faenado: number
}

interface CompraFaenaResumen {
  total_lotes: number
  total_cabezas: number
  total_faenado: number
}

interface ComprasFaenaData {
  lotes: CompraFaenaLote[]
  resumen: CompraFaenaResumen
}
```

### 4.6 Interfaces de Resúmenes

```typescript
interface LoteResumen {
  id: number
  lote: string
  empresa: string
  fecha: string
  cantidad: number
  monto: number
  peso_compra_kg: number
  total_faenado: number
  kg_distribuidos: number
  cabezas_distribuidas: number
  costo_kg: number
  rendimiento_pct: number
  pct_distribuido: number
  cerrado: boolean
}

interface ResumenSucursalSeleccionada {
  local: string
  kg: number
  cabezas: number
}

interface ResumenesData {
  resumenes: LoteResumen[]
  totales: {
    lotes: number
    cabezas: number
    monto: number
    kg_distribuidos: number
  }
}
```

### 4.7 Interfaces de Usuarios

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

### 4.8 Interfaces de Flota

```typescript
interface FlotaVehiculo {
  id: number
  codigo: string
  nombre: string
  chapa: string
  marca: string
  modelo: string
  anho: number
  tipo: string
  sucursal: string
  chofer: string
  activo: boolean
}

interface FlotaProveedor {
  id: number
  nombre: string
  tipo: 'combustible' | 'taller' | 'otros'
  ruc: string
  telefono: string
  activo: boolean
}

interface FlotaTipoGasto {
  id: number
  nombre: string
  activo: boolean
}

interface FlotaCatalogosData {
  vehiculos: FlotaVehiculo[]
  proveedores: FlotaProveedor[]
  tipos_gasto: FlotaTipoGasto[]
}

interface FlotaCombustibleRow {
  id: number
  vehiculo_id: number
  vehiculo_nombre: string
  fecha: string
  proveedor_nombre: string
  litros: number
  importe: number
  precio_litro: number
  tipo_combustible: string
  km_actual: number
  nro_factura: string
  cargado_por: string
}

interface FlotaGastoRow {
  id: number
  vehiculo_id: number
  vehiculo_nombre: string
  fecha: string
  tipo_gasto_nombre: string
  importe: number
  km_actual: number
  proveedor_nombre: string
  factura: string
  detalle: string
  cargado_por: string
}

interface FlotaResumenRow {
  vehiculo_id: number
  vehiculo_nombre: string
  litros: number
  total_combustible: number
  total_gastos: number
  total_general: number
}

interface FlotaResumenSucursalRow {
  sucursal: string
  litros: number
  total_combustible: number
  total_gastos: number
  total_general: number
}

interface FlotaComparativoSemanaRow {
  semana: number
  total_combustible: number
  total_gastos: number
}

interface FlotaRankingCostoRow {
  vehiculo_nombre: string
  costo_por_km: number
}

interface FlotaResumenSemanalData {
  semana: number
  anho: number
  fecha_inicio: string
  fecha_fin: string
  por_vehiculo: FlotaResumenRow[]
  por_sucursal: FlotaResumenSucursalRow[]
  comparativo_semanas: FlotaComparativoSemanaRow[]
  ranking_costo_por_km: FlotaRankingCostoRow[]
}

interface FlotaCombustibleImportPreviewRow {
  fila: number
  vehiculo: string
  fecha: string
  litros: number
  importe: number
  tipo_combustible: string
  ok: boolean
  error: string | null
}

interface FlotaCombustibleImportPreviewResult {
  preview: FlotaCombustibleImportPreviewRow[]
  validos: number
  errores: number
}

interface FlotaCombustibleImportResult {
  importados: number
  errores: string[]
}
```

---

## 5. Estado Reactivo

### 5.1 Signals de carga

```typescript
loading            = signal(false)           // dashboard
recepcionLoading   = signal(false)
distribucionLoading = signal(false)
compraLoading      = signal(false)
resumenLoading     = signal(false)
usuariosLoading    = signal(false)
flotaLoading       = signal(false)
authLoading        = signal(true)
```

### 5.2 Signals de mensajes

```typescript
error             = signal('')   // error global (dashboard)
authError         = signal('')
recepcionError    = signal('')
recepcionOk       = signal('')
distribucionError = signal('')
distribucionOk    = signal('')
usuariosError     = signal('')
usuariosOk        = signal('')
flotaError        = signal('')
flotaOk           = signal('')
```

### 5.3 Signals de datos

```typescript
currentUser          = signal<CurrentUser | null>(null)
data                 = signal<DashboardData | null>(null)
recepcion            = signal<RecepcionData | null>(null)
distribuciones       = signal<DistribucionesData | null>(null)
comprasFaena         = signal<ComprasFaenaData | null>(null)
resumenes            = signal<ResumenesData | null>(null)
adminUsers           = signal<AdminUsersData | null>(null)
flotaCatalogos       = signal<FlotaCatalogosData | null>(null)
flotaCombustible     = signal<FlotaCombustibleRow[]>([])
flotaGastos          = signal<FlotaGastoRow[]>([])
flotaResumen         = signal<FlotaResumenSemanalData | null>(null)
flotaCombustibleImportPreview        = signal<FlotaCombustibleImportPreviewRow[]>([])
flotaCombustibleImportPreviewSummary = signal<FlotaCombustibleImportPreviewResult | null>(null)
ultimaActualizacion  = signal('')
```

### 5.4 Computed Signals por dominio

#### Permisos (derivados de `currentUser`)

| Computed | Rol | Descripción |
|---|---|---|
| `canManageOperations` | admin, supervisor | Puede crear/editar lotes, faenas y distribuciones |
| `canViewAnalytics` | admin, supervisor | Puede ver resúmenes analíticos y cerrar lotes |
| `canManageRecepcion` | admin, supervisor, recepcion | Puede operar la vista de recepción |
| `canManageUsers` | admin | Puede administrar usuarios |
| `canManageFlota` | admin, supervisor | Acceso general a flota |
| `canManageFlotaProviders` | admin | Puede crear/editar proveedores |
| `canManageFlotaVehiculos` | admin | Puede crear/editar vehículos |
| `canEditMenudencias` | admin, supervisor | Puede editar/eliminar menudencias |
| `canImportFlotaCombustible` | admin | Puede importar combustible desde Excel |
| `recepcionSucursalBloqueada` | recepcion | La sucursal fijada no es seleccionable |
| `flotaSucursalBloqueada` | recepcion | El filtro de sucursal en flota está fijo |

#### Filtrado y agregados

| Computed | Descripción |
|---|---|
| `lotesFiltrados` | Lotes del dashboard filtrados por `desde`, `hasta`, `busqueda` |
| `compraLotesFiltrados` | Lotes de compra filtrados por rango de fechas y búsqueda |
| `compraLoteSeleccionado` | Lote actualmente seleccionado en compras |
| `distribucionesFiltradas` | Distribuciones filtradas por lote y búsqueda |
| `loteDistribucionSeleccionado` | Lote activo en vista distribuciones |
| `distribucionTotalCabezas` | Suma de cabezas en distribuciones del lote seleccionado |
| `distribucionTotalKg` | Suma de kg en distribuciones del lote seleccionado |
| `resumenLotesFiltrados` | Lotes de resumenes filtrados por empresa, fechas, búsqueda y estado cerrado |
| `resumenCostoKgPromedio` | Promedio ponderado de costo/kg de los lotes filtrados |
| `resumenSeleccionTotal` | Acumulado monto+kg+cabezas de lotes seleccionados para PDF |
| `recesPendientes` | Cabezas faenadas sin distribuir |

#### Visualización

| Computed | Descripción |
|---|---|
| `maxDistribucionKg` | Máximo kg para escalar barras en el dashboard |
| `maxMenudenciaKg` | Máximo kg menudencias para escalar barras |
| `maxTopMenudenciaKg` | Máximo kg top menudencias |
| `userDisplayName` | Nombre truncado del usuario para el sidebar |
| `userRoleLabel` | Etiqueta legible del rol (Administrador, Supervisor, etc.) |
| `userInitials` | Iniciales para el avatar |
| `rangoTexto` | Texto descriptivo del período seleccionado |

#### Flota

| Computed | Descripción |
|---|---|
| `flotaVehiculosVisibles` | Vehículos filtrados por sucursal activa |
| `flotaVehiculosActivos` | Solo vehículos con `activo: true` |
| `flotaProveedoresCombustible` | Proveedores de tipo combustible |
| `flotaProveedoresActivos` | Solo proveedores activos |
| `flotaTiposGastoActivos` | Solo tipos de gasto activos |
| `flotaTotalLitros` | Suma de litros cargados en lista actual |
| `flotaTotalGeneral` | Suma del total general en lista actual |
| `flotaTotalCombustible` | Suma solo de combustible |
| `flotaTotalOtros` | Suma solo de otros gastos |
| `flotaMaxVehiculoTotal` | Máximo total por vehículo (para barras) |
| `flotaCombustibleResumen` | Agregado de combustible por vehículo para el panel resumen |

---

## 6. Vistas y Flujos

### 6.1 Vista: Login

**Trigger:** `currentUser === null` y `authLoading === false`

**Formulario:**
| Campo | Tipo | Descripción |
|---|---|---|
| `loginUsername` | text | Nombre de usuario |
| `loginPassword` | password | Contraseña |

**Flujo:**
1. Usuario ingresa credenciales → `login()`
2. POST `/api/auth/login`
3. Éxito: `currentUser.set(user)` → `ensureVistaPermitida()` → `cargarTodoInicial()`
4. Error: `authError.set('Credenciales inválidas')`

**Comportamiento de `restoreSession()`:**
- Al iniciar la app, llama GET `/api/auth/me`
- Si hay sesión activa: carga el usuario y los datos iniciales automáticamente
- Si no: muestra pantalla de login (`authLoading.set(false)`)

---

### 6.2 Vista: Dashboard

**Acceso:** admin, supervisor  
**Trigger:** `vista === 'dashboard'`

**Filtros disponibles:**
| Campo | Tipo | Default |
|---|---|---|
| `desde` | date | inicio del mes actual |
| `hasta` | date | hoy |
| `periodoSeleccionado` | string | 'mes' |
| `busqueda` | text | '' |

**Períodos predefinidos:** hoy, semana, quincena, mes, trimestre, año, todo

**KPIs configurables (`optionalKpis`):**
| Clave | Etiqueta |
|---|---|
| `lotes` | Lotes |
| `reces_compradas` | Reses Compradas |
| `reces_faenadas` | Reses Faenadas |
| `reces_distribuidas` | Reses Distribuidas |
| `kg_distribuidos` | KG Distribuidos |
| `monto_total` | Monto Total |
| `costo_kg_promedio` | Costo/KG Promedio |

Cada KPI puede mostrarse u ocultarse; la preferencia se persiste en `localStorage`.

**Paneles de datos:**
- Distribución por empresa (barras horizontales)
- Distribución por local/sucursal (barras horizontales)
- Top menudencias por producto (barras)
- Menudencias por sucursal (tabla comparativa: Areguá / Luque / Itauguá)

---

### 6.3 Vista: Compras y Faena

**Acceso:** admin, supervisor  
**Trigger:** `vista === 'compras-faena'`

#### Sub-panel: Lista de lotes

**Filtros:**
| Campo | Tipo | Descripción |
|---|---|---|
| `compraBusqueda` | text | Búsqueda libre por número de lote |
| `compraDesde` | date | Fecha desde |
| `compraHasta` | date | Fecha hasta |

**Acciones disponibles:**
- Crear nuevo lote (abre editor inline)
- Editar lote existente (abre modal)
- Registrar faena en un lote
- Ajustar total faenado (para correcciones)

#### Formulario: Nuevo / Editar Lote

| Campo | Tipo | Descripción |
|---|---|---|
| `compraLote` | text | Código de lote (autocompletado) |
| `compraEmpresa` | select | Corral / Rodeo / Ferusa / TROPA |
| `compraFecha` | date | Fecha de compra |
| `compraCantidad` | number | Cabezas compradas |
| `compraMonto` | number | Monto pagado (Gs.) |
| `compraPesoKg` | number | Peso vivo en kg |

Lógica especial: `buildLoteCode()` genera el código de lote automáticamente basado en empresa y fecha; el usuario puede overridear con `marcarCompraLoteManual()`.

#### Formulario: Registrar Faena

| Campo | Tipo | Descripción |
|---|---|---|
| `faenaFecha` | date | Fecha de faena |
| `faenaCantidad` | number | Cabezas faenadas |
| `faenaNota` | text | Observación opcional |

#### Formulario: Ajustar Faena (override)

| Campo | Tipo | Descripción |
|---|---|---|
| `faenaAjusteFecha` | date | |
| `faenaAjusteCantidad` | number | Nuevo total faenado |
| `faenaAjusteNota` | text | Motivo del ajuste |

---

### 6.4 Vista: Distribuciones

**Acceso:** admin, supervisor  
**Trigger:** `vista === 'distribuciones'`

**Layout:** Vista de dos paneles — lista de lotes + detalle de distribuciones del lote seleccionado.

**Filtros:**
| Campo | Tipo | Descripción |
|---|---|---|
| `distribucionBusqueda` | text | Búsqueda por lote |
| `mostrarTodosLotesDistribucion` | boolean | Muestra lotes con saldo = 0 |

**Formulario: Nueva Distribución**

| Campo | Tipo | Descripción |
|---|---|---|
| `distribucionFecha` | date | Fecha de distribución |
| `distribucionLocal` | select | LUQUE / AREGUA / ITAUGUA |
| `distribucionKg` | number | Kg enviados |
| `distribucionCabezas` | number | Cabezas enviadas |
| `distribucionNota` | text | Observación |

**Formulario: Editar Distribución (modal)**

Mismo conjunto de campos prefijados con `modal`:
`modalDistribucionFecha`, `modalDistribucionLocal`, `modalDistribucionKg`, `modalDistribucionCabezas`, `modalDistribucionNota`

**Acciones:**
- Crear distribución → `guardarDistribucion()`
- Editar distribución (abre modal) → `guardarDistribucionEditada()`
- Eliminar distribución → `eliminarDistribucion(id)`
- Ver detalle de distribución → `verDistribucion(id)`

**Indicadores por lote:**
- Total faenado vs. distribuido (cabezas y kg)
- Saldo de cabezas pendientes de distribución
- Barra de progreso de distribución

---

### 6.5 Vista: Recepción

**Acceso:** admin, supervisor (todas las sucursales), recepcion (solo su sucursal asignada)  
**Trigger:** `vista === 'recepcion'`

**Selector de sucursal:**
| Slug | Nombre mostrado |
|---|---|
| `luque` | Luque |
| `aregua` | Areguá |
| `itaugua` | Itauguá |

Para rol `recepcion`: la sucursal está bloqueada a `currentUser().sucursal_permitida`.

**Filtros:**
| Campo | Tipo | Descripción |
|---|---|---|
| `recepcionFecha` | date | Fecha de recepción (default: hoy) |
| `recepcionBusqueda` | text | Búsqueda por lote/empresa |
| `menuBusqueda` | text | Búsqueda de menudencias |

**Formulario: Actualizar Recepción de una Distribución**

Se accede seleccionando una fila de la tabla. Campos:
| Campo | Tipo | Descripción |
|---|---|---|
| `recepcionKg` | number | KG físicamente recibidos |
| `recepcionNota` | text | Observación de la recepción |

**Formulario: Nueva Menudencia**

| Campo | Tipo | Descripción |
|---|---|---|
| `nuevoProducto` | text | Nombre del producto (ej. "Higado") |
| `nuevoKg` | number | Kg recibidos |
| `nuevoUnidades` | number | Unidades |

**Acciones:**
- Seleccionar distribución → muestra formulario de recepción inline
- Guardar recepción de kg → `guardarRecepcionKg()`
- Agregar menudencia → `agregarMenudencia()`
- Editar menudencia inline → `actualizarMenudencia()`
- Eliminar menudencia → `eliminarMenudencia(id)` *(solo admin/supervisor)*
- Descargar PDF del día → `abrirReporteRecepcionPdf()`

**Indicadores del resumen:**
- Total kg enviados vs. recibidos
- Diferencia total del día (sobrante/faltante)

---

### 6.6 Vista: Resúmenes Analíticos

**Acceso:** admin, supervisor  
**Trigger:** `vista === 'resumenes'`

**Filtros:**
| Campo | Tipo | Descripción |
|---|---|---|
| `resumenFiltro` | string | 'todos' / 'abiertos' / 'cerrados' |
| `resumenEmpresa` | string | '' = todas |
| `resumenDesde` | date | |
| `resumenHasta` | date | |
| `resumenBusqueda` | text | Búsqueda libre por lote |
| `resumenMaxFilas` | number | Límite de filas mostradas |

**Columnas de la tabla:**
| Columna | Descripción |
|---|---|
| Lote | Código de lote + empresa |
| Fecha | Fecha de compra |
| Compra | Cabezas + monto |
| Faena | Total faenado |
| Distribución | KG + cabezas distribuidas |
| Costo/KG | Costo por kilogramo calculado |
| Rendimiento | % peso distribuido vs. peso compra |
| % Distribuido | % cabezas distribuidas vs. faenado |
| Estado | Ícono 🔓 abierto / 🔒 cerrado |

**Selección múltiple:** `resumenSeleccionados = Set<number>`

**Acciones:**
- Seleccionar/deseleccionar lote → `toggleResumenSeleccion(id)`
- Cerrar lotes seleccionados → `marcarResumenesComoCerrados()` *(solo admin/supervisor)*
- Descargar PDF de lotes seleccionados → `descargarResumenesPdf()`
- `resumenSeleccionTotal` muestra acumulados de los seleccionados

---

### 6.7 Vista: Usuarios

**Acceso:** admin  
**Trigger:** `vista === 'usuarios'`

**Tabla de usuarios:**
Columnas: Nombre, Username, Rol, Sucursal, Activo, Último login, Acciones

**Formulario: Crear/Editar Usuario**

| Campo | Tipo | Descripción |
|---|---|---|
| `usuarioNombre` | text | Nombre completo |
| `usuarioUsername` | text | Login |
| `usuarioPassword` | password | Solo en creación |
| `usuarioRol` | select | admin / supervisor / recepcion |
| `usuarioSucursalPermitida` | select | luque / aregua / itaugua (solo si rol = recepcion) |
| `usuarioActivo` | boolean | Estado activo/inactivo |

**Formulario: Cambiar Contraseña**

| Campo | Tipo | Descripción |
|---|---|---|
| `usuarioPasswordEditId` | number | ID del usuario objetivo |
| `usuarioPasswordNueva` | password | Nueva contraseña |

**Acciones:**
- Crear usuario → `crearUsuario()`
- Guardar edición → `guardarUsuario()`
- Cambiar contraseña → `iniciarCambioPassword(id)` → `guardarPasswordUsuario()`
- Cancelar cambio de contraseña → `cancelarCambioPassword()`

---

### 6.8 Vista: Flota

**Acceso:** admin, supervisor (todas las sucursales), recepcion (solo su sucursal)  
**Trigger:** `vista === 'flota'`

La vista de flota tiene 4 secciones internas (`FlotaSection`):

#### Sección: Resumen

Muestra resumen semanal/mensual de combustible y gastos.

**Filtros de período:**
| Campo | Tipo | Descripción |
|---|---|---|
| `flotaMes` | number | Mes (1-12) |
| `flotaAnho` | number | Año |
| `flotaSemana` | number | Semana ISO |
| `flotaFechaReferencia` | date | Fecha base para calcular semana |
| `flotaFiltroSucursal` | string | Filtro de sucursal |
| `flotaResumenVehiculoId` | number | Filtro por vehículo específico |

Navegación: `shiftFlotaMonth(-1/+1)` para avanzar/retroceder mes.

**Tablas:**
- Resumen por vehículo (litros, total combustible, otros gastos, total general)
- Resumen por sucursal
- Comparativo semanas del mes
- Ranking de costo por km

**Acción:** `descargarFlotaResumenPdf()` → PDF mensual

#### Sección: Vehículos

**Tabla:** código, nombre, chapa, marca, tipo, sucursal, chofer, activo

**Formulario: Crear/Editar Vehículo**

| Campo | Tipo | Descripción |
|---|---|---|
| `vehiculoCodigo` | text | Código interno |
| `vehiculoNombre` | text | Nombre descriptivo |
| `vehiculoChapa` | text | Patente |
| `vehiculoMarca` | text | |
| `vehiculoModelo` | text | |
| `vehiculoAnho` | number | Año |
| `vehiculoTipo` | select | camion / utilitario / auto / moto |
| `vehiculoSucursal` | select | luque / aregua / itaugua / '' |
| `vehiculoChofer` | text | Nombre del chofer |
| `vehiculoActivo` | boolean | |

**Acciones:** `crearVehiculoFlota()`, `editarVehiculoFlota(id)`, `cancelarEdicionVehiculo()`

Inline: Formulario de creación de proveedor (`crearProveedorFlota()`)

#### Sección: Combustible

**Filtros:**
| Campo | Tipo | Descripción |
|---|---|---|
| `combustibleDesde` | date | |
| `combustibleHasta` | date | |
| `combustibleVehiculoId` | number | Filtro por vehículo |
| `flotaFiltroSucursal` | string | Filtro por sucursal |

**Formulario: Nueva Carga**

| Campo | Tipo | Descripción |
|---|---|---|
| `combustibleFecha` | date | |
| `combustibleVehiculoId` | number | |
| `combustibleProveedorId` | number | |
| `combustibleTipo` | select | gasoil / nafta |
| `combustibleLitros` | number | |
| `combustibleImporte` | number | Monto total |
| `combustibleFactura` | text | Nro. de factura |
| `combustibleObservacion` | text | |

**Precio/litro** calculado automáticamente: `combustiblePrecioLitro()` = importe / litros.

**Importación Excel:**

| Campo | Descripción |
|---|---|
| `combustibleImportFile` | Archivo `.xlsx` seleccionado |
| `combustibleImportFileName` | Nombre del archivo mostrado |
| `combustibleImportProveedorId` | Proveedor por defecto para la importación |

**Flujo de importación:**
1. `onCombustibleImportSelected()` → archivo seleccionado, muestra nombre
2. `previsualizarCombustibleArchivo()` → POST preview → muestra tabla con estado por fila
3. `importarCombustibleArchivo()` → POST import → confirma inserción

**Acciones de lista:**
- `eliminarCargaCombustible(id)` → solicita motivo → soft delete

#### Sección: Gastos

**Filtros:**
| Campo | Tipo | Descripción |
|---|---|---|
| `flotaGastoVehiculoId` | number | |
| `flotaTipoGastoFiltroId` | number | |
| `combustibleDesde` | date | (compartido) |
| `combustibleHasta` | date | (compartido) |

**Formulario: Nuevo Gasto**

| Campo | Tipo | Descripción |
|---|---|---|
| `gastoFecha` | date | |
| `gastoVehiculoId` | number | |
| `gastoTipoId` | number | Tipo de gasto |
| `gastoImporte` | number | |
| `gastoKmActual` | number | Odómetro actual |
| `gastoProveedorId` | number | Proveedor del catálogo (opcional) |
| `gastoProveedorNombre` | text | O bien nombre manual |
| `gastoProveedorRuc` | text | RUC manual |
| `gastoFactura` | text | |
| `gastoDetalle` | text | Descripción del gasto |

---

## 7. Servicio HTTP — DashboardService

### 7.1 Configuración base

```typescript
private readonly apiUrl = environment.apiUrl  // 'http://192.168.10.12:8008/api'
```

Todos los requests incluyen `{ withCredentials: true }` para enviar la cookie de sesión.

### 7.2 Métodos de autenticación

| Método | HTTP | Endpoint |
|---|---|---|
| `login(payload)` | POST | `/auth/login` |
| `logout()` | POST | `/auth/logout` |
| `getCurrentUser()` | GET | `/auth/me` |
| `getAdminUsers()` | GET | `/auth/users` |
| `createAdminUser(payload)` | POST | `/auth/users` |
| `updateAdminUser(payload)` | PUT | `/auth/users` |
| `updateAdminPassword(payload)` | PUT | `/auth/users/password` |

### 7.3 Métodos de datos

| Método | HTTP | Endpoint |
|---|---|---|
| `getDashboard(desde?, hasta?)` | GET | `/dashboard` |
| `getRecepcion(sucursal, fecha?)` | GET | `/recepcion/{sucursal}` |
| `getRecepcionPdf(sucursal, fecha?)` | GET | `/recepcion/{sucursal}/pdf` |
| `updateRecepcionDistribucion(sucursal, payload)` | POST | `/recepcion/{sucursal}/distribuciones` |
| `addMenudencia(sucursal, payload)` | POST | `/recepcion/{sucursal}/menudencias` |
| `updateMenudencia(sucursal, payload)` | PUT | `/recepcion/{sucursal}/menudencias` |
| `deleteMenudencia(sucursal, id)` | DELETE | `/recepcion/{sucursal}/menudencias` |
| `getDistribuciones(loteId?)` | GET | `/distribuciones` |
| `saveDistribucion(payload)` | POST | `/distribuciones` |
| `deleteDistribucion(id)` | DELETE | `/distribuciones` |
| `getComprasFaena(loteId?)` | GET | `/compras-faena` |
| `saveCompraLote(payload)` | POST | `/compras-faena/lotes` |
| `addFaena(payload)` | POST | `/compras-faena/faenas` |
| `setFaenaTotal(payload)` | POST | `/compras-faena/faena-total` |
| `getResumenes(loteIds?)` | GET | `/resumenes` |
| `getResumenesPdf(loteIds)` | GET | `/resumenes/pdf` |
| `marcarResumenesCerrados(loteIds, cerrado?)` | POST | `/resumenes/cerrar` |
| `getFlotaCatalogos()` | GET | `/flota/catalogos` |
| `saveFlotaVehiculo(payload)` | POST | `/flota/vehiculos` |
| `saveFlotaProveedor(payload)` | POST | `/flota/proveedores` |
| `getFlotaCombustible(filters)` | GET | `/flota/combustible` |
| `saveFlotaCombustible(payload)` | POST | `/flota/combustible` |
| `deleteFlotaCombustible(payload)` | POST | `/flota/combustible/eliminar` |
| `importFlotaCombustible(payload)` | POST | `/flota/combustible/import` |
| `previewFlotaCombustibleImport(payload)` | POST | `/flota/combustible/import/preview` |
| `getFlotaGastos(filters)` | GET | `/flota/gastos` |
| `saveFlotaGasto(payload)` | POST | `/flota/gastos` |
| `getFlotaResumenSemanal(filters)` | GET | `/flota/resumen-semanal` |
| `getFlotaResumenMensualPdf(filters)` | GET | `/flota/resumen-mensual/pdf` |

---

## 8. Autorización en Frontend

> **Importante:** El control de acceso en el frontend es de UX (oculta elementos), no de seguridad. La seguridad real está aplicada en el backend.

### 8.1 Restricciones de navegación

`ensureVistaPermitida()` se llama después del login y redirige al usuario si no tiene acceso a su vista actual:
- Rol `recepcion`: solo puede acceder a `recepcion` y `flota`.
- Al iniciar sesión, rol `recepcion` es llevado directamente a `recepcion`.

### 8.2 Ocultamiento de elementos

Los botones y formularios de creación/edición solo se muestran si el computed de permiso correspondiente es `true`:
- `*ngIf="canManageOperations()"` → Botones crear lote, registrar faena
- `*ngIf="canViewAnalytics()"` → Vista resúmenes, botón cerrar lotes
- `*ngIf="canManageUsers()"` → Ítem de menú Usuarios, formulario de usuario
- `*ngIf="canManageFlotaVehiculos()"` → Formulario de vehículos
- `*ngIf="canEditMenudencias()"` → Botones editar/eliminar menudencias

### 8.3 Sidebar dinámico

El menú lateral solo muestra los ítems a los que el usuario tiene acceso según su rol:
- Dashboard: admin, supervisor
- Compras-Faena: admin, supervisor
- Distribuciones: admin, supervisor
- Resúmenes: admin, supervisor
- Recepción: todos
- Flota: todos
- Usuarios: admin

---

## 9. Sistema de Diseño

### 9.1 Layout

- **Max-width:** 1440px centrado
- **Sidebar:** fijo a la izquierda, colapsable
- **Content:** `calc(100% - sidebar-width)` con scroll interno
- **Topbar:** barra superior con filtros globales y controles

### 9.2 Paleta de colores (modo claro)

| Token CSS | Valor | Uso |
|---|---|---|
| `--color-primary` | `#2563eb` (azul) | Botones primarios, links activos |
| `--color-success` | `#16a34a` (verde) | Mensajes OK, lotes cerrados |
| `--color-danger` | `#dc2626` (rojo) | Errores, diferencias negativas |
| `--color-warning` | `#d97706` (naranja) | Alertas, pendientes |
| `--color-surface` | `#ffffff` | Paneles |
| `--color-bg` | `#f8fafc` | Fondo general |
| `--color-border` | `#e2e8f0` | Bordes de tablas y paneles |
| `--color-text` | `#1e293b` | Texto principal |
| `--color-text-muted` | `#64748b` | Texto secundario |

### 9.3 Modo oscuro

- Activado con `.dark-mode` en el elemento raíz
- La preferencia se persiste en `localStorage`
- Override de variables CSS en selector `.dark-mode`

### 9.4 Tipografía

- Fuente base: sistema (sans-serif de la plataforma)
- Escala modular de tamaños: 12px, 14px (base), 16px, 18px, 24px
- Monospace para números financieros en tablas

### 9.5 Componentes de UI reutilizados (sin componente separado)

| Patrón | Descripción |
|---|---|
| `.panel` | Tarjeta blanca con borde y sombra |
| `.kpi-card` | Tarjeta de indicador con valor grande |
| `.table-wrap` | Contenedor de tabla con scroll horizontal |
| `.form-grid` | Grid de 2-3 columnas para formularios |
| `.bar-track` / `.bar-fill` | Barra de progreso inline |
| Modal backdrop | Overlay oscuro + panel central |
| Loading overlay | Indicador de carga sobre contenido |
| Mensaje OK/Error | Toast inline debajo del formulario |

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

Toggle global con `toggleDarkMode()`. Aplica clase `.dark-mode` al `document.body` y persiste en `localStorage` bajo clave `dark-mode`.

### 10.2 Preferencias de KPIs

- El usuario puede mostrar/ocultar cada KPI del dashboard con `toggleKpi(key)`
- Las preferencias se guardan en `localStorage` con `cargarPreferenciasKpis()` / `guardarPreferenciasKpis()`
- El menú se abre/cierra con `toggleKpiMenu()`

### 10.3 Formateo de números

| Método | Descripción |
|---|---|
| `fmtNumber(n, decimals?)` | Formato con separadores de miles y decimales (locale ES) |
| `fmtMoney(n)` | Moneda en Guaraníes: "₲ 1.500.000" |
| `fmtFlotaMoney(n)` | Igual a fmtMoney para contexto flota |
| `combustiblePrecioLitro()` | Calcula precio/litro del formulario activo |

### 10.4 Formateo de fechas

| Método | Descripción |
|---|---|
| `toIsoDate(d)` | Convierte `Date` a `YYYY-MM-DD` |
| `formatHumanDate(iso)` | Convierte `YYYY-MM-DD` a formato legible (ej. "23 abr") |
| `getIsoWeekFromDate(d)` | Obtiene número de semana ISO de una fecha |
| `getCurrentIsoWeek()` | Semana ISO actual |
| `getIsoWeekStartDate(week, year)` | Fecha de inicio de semana ISO |

### 10.5 Descarga de PDFs

El servicio retorna `Blob` para los endpoints PDF. El frontend:
1. Crea un `URL.createObjectURL(blob)`
2. Hace `window.open(url)` para abrir en nueva pestaña
3. Libera el URL con `URL.revokeObjectURL(url)`

### 10.6 Actualización de datos

`ultimaActualizacion.set(new Date().toLocaleTimeString())` se actualiza tras cada carga exitosa de datos.

---

## 11. Requisitos No Funcionales

| Requisito | Valor objetivo |
|---|---|
| Tiempo de carga inicial (bundle) | < 3 segundos en LAN |
| Budget Angular bundle (warning) | 500 KB |
| Budget Angular bundle (error) | 1 MB |
| Navegadores objetivo | Chrome / Edge modernos (Chromium-based) |
| Modo de uso | Interno, red LAN, resoluciones ≥ 1366×768 |
| Accesibilidad | No definida formalmente |

---

## 12. Deuda Técnica Documentada

### 12.1 Alta prioridad

| Ítem | Descripción | Impacto |
|---|---|---|
| `app.component.ts` monolítico (~2819 líneas) | Todo el estado, lógica y métodos en un único componente | Imposible escribir tests unitarios; navegación entre vistas mezcla contextos |
| `app.component.html` monolítico (~2153 líneas) | Todo el markup en un archivo | Cambios de UI en una vista pueden romper otra |
| URL backend hardcodeada | `192.168.10.12:8008` en `environment.ts` | Cambiar de servidor requiere rebuild del frontend |
| Sin Angular Router | La navegación entre vistas se hace con `vista` signal | No hay URLs profundas; no se puede compartir un enlace directo a una vista |

### 12.2 Media prioridad

| Ítem | Descripción |
|---|---|
| Sin tests unitarios ni e2e | Cualquier refactor requiere validación manual completa |
| Template-Driven Forms en formularios complejos | Validación más difícil de manejar que Reactive Forms |
| `app.component.css` (~2137 líneas) | Estilos de todas las vistas en un archivo; alto riesgo de colisiones de selectores |
| Sin manejo de errores 401 | No hay interceptor que redirija a login cuando la sesión expira |
| Formularios sin validación client-side | Campos requeridos, rangos numéricos y formatos no se validan antes de enviar |

### 12.3 Baja prioridad

| Ítem | Descripción |
|---|---|
| Sin lazy loading | Todas las vistas cargan en el bundle inicial |
| Sin paginación en tablas | Listas largas de lotes se renderizan completas |
| Lógica de fechas manual | `getIsoWeekFromDate`, `weekdayAbbrev`, etc. podrían reemplazarse con date-fns |
| Sin i18n formal | Textos hardcodeados en español; no parametrizados |

---

## 13. Roadmap Propuesto

### Fase 1 — Estabilización (próximas 4 semanas)

- [ ] Parametrizar `apiUrl` via variable de entorno en el proceso de build (`NG_APP_API_URL`).
- [ ] Agregar interceptor HTTP para manejar respuestas `401` (redirigir a login automáticamente).
- [ ] Agregar validación básica client-side en formularios críticos (campos requeridos, mínimos numéricos).
- [ ] Resolver budget warnings del bundle Angular.

### Fase 2 — Modularización (2–3 meses)

- [ ] Separar cada vista en un componente standalone independiente: `DashboardComponent`, `RecepcionComponent`, `FlotaComponent`, etc.
- [ ] Introducir Angular Router con rutas por vista (`/dashboard`, `/recepcion/:slug`, etc.).
- [ ] Migrar formularios de alta complejidad a Reactive Forms con validadores.
- [ ] Separar estilos en archivos CSS por componente.
- [ ] Implementar interceptor HTTP global para manejo centralizado de errores.

### Fase 3 — Modernización (3–6 meses)

- [ ] Agregar tests unitarios por componente con Jest o Karma.
- [ ] Implementar paginación del lado cliente (o servidor) en tablas largas.
- [ ] Reemplazar utilidades de fecha manuales con `date-fns` o `@angular/common` pipes.
- [ ] Implementar lazy loading por módulo de vista para reducir bundle inicial.
- [ ] Mejorar accesibilidad: ARIA labels, navegación por teclado en formularios y tablas.

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
| FlotaSection | Sub-sección dentro de la vista de flota |
| Slug | Identificador en URL de la sucursal: `luque`, `aregua`, `itaugua` |
| KPI | Key Performance Indicator — indicador clave de desempeño mostrado en tarjetas del dashboard |
| PDF Blob | Archivo PDF recibido del backend como datos binarios y abierto directamente en el navegador |
