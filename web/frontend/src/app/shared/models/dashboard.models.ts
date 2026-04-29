import { AdminUser, UserRole } from '../../core/auth/auth.models';

export type { AdminUser } from '../../core/auth/auth.models';

export interface ResumenKpis {
  reses_camara: number;
  reses_sin_faenar: number;
  lotes_pendientes: number;
  lotes: number;
  reces_compradas: number;
  reces_faenadas: number;
  reces_distribuidas: number;
  kg_distribuidos: number;
  kg_compra: number;
  monto_total: number;
  costo_kg_promedio: number;
  pct_distribuido: number;
  rendimiento_pct: number;
}

export interface CompraEmpresa {
  empresa: string;
  reces: number;
  kg_compra: number;
  monto: number;
}

export interface DistribucionLocal {
  local: string;
  reces: number;
  kg: number;
}

export interface MenudenciaSucursal {
  sucursal: string;
  kg: number;
  unidades: number;
}

export interface TopMenudencia {
  producto: string;
  kg: number;
  unidades: number;
  kg_por_unidad: number;
}

export interface MenudenciaProductoSucursal {
  producto: string;
  kg_total: number;
  unidades_total: number;
  aregua_kg: number;
  aregua_unidades: number;
  luque_kg: number;
  luque_unidades: number;
  itaugua_kg: number;
  itaugua_unidades: number;
}

export interface RecepcionDistribucion {
  id: number;
  lote_id: number;
  lote: string;
  origen: string;
  fecha: string;
  kg: number;
  cabezas: number;
  nota: string;
  local: string;
  diferencia_kg: number;
}

export interface RecepcionMenudencia {
  id: number;
  fecha: string;
  producto: string;
  kg: number;
  unidades: number;
}

export type RecepcionSucursalSlug = 'aregua' | 'luque' | 'itaugua';

export interface RecepcionData {
  fecha: string;
  sucursal: string;
  local: string;
  distribuciones: RecepcionDistribucion[];
  menudencias: RecepcionMenudencia[];
}

export interface DistribucionLote {
  id: number;
  lote: string;
  empresa: string;
  fecha: string;
  faenado: number;
  distribuidas: number;
  has_zero_kg: boolean;
}

export interface DistribucionRow {
  id: number;
  lote_id?: number;
  fecha: string;
  local: string;
  kg: number;
  nota: string;
  cabezas: number;
  diferencia_kg: number;
}

export interface DistribucionResumenLocal {
  local: string;
  kg: number;
  cabezas: number;
}

export interface DistribucionesData {
  lotes: DistribucionLote[];
  selected_lote_id: number | null;
  distribuciones: DistribucionRow[];
  resumenLocal: DistribucionResumenLocal[];
}

export interface CompraFaenaLote {
  id: number;
  lote: string;
  empresa: string;
  fecha: string;
  cantidad: number;
  faenado: number;
  restante: number;
  distribuidas: number;
  monto: number;
  peso_compra_kg: number;
}

export interface CompraFaenaResumen {
  lotes_registrados: number;
  reses_camara: number;
  reses_sin_faenar: number;
  lotes_pendientes: number;
}

export interface CompraFaenaRow {
  id: number;
  lote_id: number;
  fecha: string;
  cantidad: number;
  nota: string;
}

export interface ComprasFaenaData {
  empresas: string[];
  resumen: CompraFaenaResumen;
  lotes: CompraFaenaLote[];
  pendientes: CompraFaenaLote[];
  completados: CompraFaenaLote[];
  selected_lote_id: number | null;
  faenas: CompraFaenaRow[];
}

export interface LoteResumen {
  id: number;
  lote: string;
  empresa: string;
  fecha: string;
  cerrado: boolean;
  cantcompra: number;
  faenado: number;
  distribuido: number;
  kg: number;
  kgcompra: number;
  monto: number;
  costokg: number;
  pct_distribuido: number;
  pct_restante: number;
  rend_pct: number;
}

export interface DashboardData {
  resumen: ResumenKpis;
  comprasPorEmpresa: CompraEmpresa[];
  distribucionesPorLocal: DistribucionLocal[];
  menudenciasPorSucursal: MenudenciaSucursal[];
  topMenudencias: TopMenudencia[];
  menudenciasPorProductoSucursal: MenudenciaProductoSucursal[];
  lotes: LoteResumen[];
}

export interface ResumenSucursalSeleccionada {
  local: string;
  kg: number;
  cabezas: number;
  dif_kg: number;
}

export interface ResumenesData {
  empresas: string[];
  lotes: LoteResumen[];
  selected_lote_ids: number[];
  resumenSucursales: ResumenSucursalSeleccionada[];
}

export interface AdminUsersData {
  roles: Array<UserRole | string>;
  users: AdminUser[];
}

export interface FlotaSucursal {
  slug: RecepcionSucursalSlug;
  nombre: string;
  local: string;
}

export interface FlotaVehiculo {
  id: number;
  codigo?: string | null;
  chapa?: string | null;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  anho?: number | null;
  tipo?: string | null;
  sucursal?: RecepcionSucursalSlug | null;
  chofer?: string | null;
  activo: boolean;
  creado_en?: string | null;
}

export interface FlotaProveedor {
  id: number;
  nombre: string;
  tipo: 'combustible' | 'taller' | 'otros';
  ruc?: string | null;
  telefono?: string | null;
  activo: boolean;
}

export interface FlotaTipoGasto {
  id: number;
  nombre: string;
  requiere_km: boolean;
  activo: boolean;
}

export interface FlotaCatalogosData {
  vehiculos: FlotaVehiculo[];
  proveedores: FlotaProveedor[];
  tiposGasto: FlotaTipoGasto[];
  sucursales: FlotaSucursal[];
}

export interface FlotaCombustibleRow {
  id: number;
  fecha: string;
  vehiculo_id: number;
  vehiculo_codigo?: string | null;
  vehiculo_nombre: string;
  chapa?: string | null;
  sucursal?: string | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string;
  litros: number;
  importe: number;
  precio_litro: number;
  tipo_combustible?: string | null;
  km_actual?: number | null;
  nro_factura?: string;
  observacion?: string;
  semana: number;
  anho: number;
  cargado_por?: string | null;
  creado_en?: string | null;
  eliminado_en?: string | null;
  eliminado_por?: string | null;
  motivo_eliminacion?: string | null;
}

export interface FlotaCombustibleImportResult {
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  missing_vehicles?: Array<{ vehiculo: string; count: number }>;
}

export interface FlotaCombustibleImportPreviewRow {
  row: number;
  vehiculo_ref: string;
  vehiculo_match: string;
  fecha: string;
  tipo_combustible: string;
  litros: number;
  precio_litro: number;
  importe: number;
  nro_factura: string;
  status: 'ok' | 'error';
  error?: string;
}

export interface FlotaCombustibleImportPreviewResult {
  items: FlotaCombustibleImportPreviewRow[];
  skipped: number;
  ok_count: number;
  error_count: number;
}

export interface FlotaGastoRow {
  id: number;
  fecha: string;
  vehiculo_id: number;
  vehiculo_codigo?: string | null;
  vehiculo_nombre: string;
  chapa?: string | null;
  sucursal?: string | null;
  tipo_gasto_id: number;
  tipo_gasto: string;
  requiere_km?: boolean;
  proveedor_id?: number | null;
  proveedor_nombre?: string;
  proveedor_ruc?: string;
  importe: number;
  km_actual?: number | null;
  nro_factura?: string;
  detalle?: string;
  semana: number;
  anho: number;
  cargado_por?: string | null;
  creado_en?: string | null;
  eliminado_en?: string | null;
  eliminado_por?: string | null;
  motivo_eliminacion?: string | null;
}

export interface FlotaResumenRow {
  vehiculo_id: number;
  codigo?: string | null;
  nombre: string;
  chapa?: string | null;
  sucursal?: string | null;
  tipo?: string | null;
  mes: number;
  anho: number;
  litros: number;
  combustible_total: number;
  otros_gastos: number;
  total_general: number;
  precio_litro_promedio: number;
  km_min?: number | null;
  km_actual?: number | null;
  km_recorrido?: number;
  costo_por_km?: number | null;
}

export interface FlotaResumenSucursalRow {
  sucursal: string;
  vehiculos: number;
  litros: number;
  combustible_total: number;
  otros_gastos: number;
  total_general: number;
}

export interface FlotaComparativoSemanaRow {
  mes: number;
  anho: number;
  vehiculos: number;
  combustible_total: number;
  otros_gastos: number;
  total_general: number;
}

export interface FlotaRankingCostoRow {
  vehiculo_id: number;
  codigo?: string | null;
  nombre: string;
  sucursal?: string | null;
  tipo?: string | null;
  total_general: number;
  costo_por_km?: number | null;
}

export interface FlotaResumenSemanalData {
  totales: {
    mes: number;
    anho: number;
    vehiculos: number;
    litros: number;
    combustible_total: number;
    otros_gastos: number;
    total_general: number;
  };
  items: FlotaResumenRow[];
  totalesPorSucursal: FlotaResumenSucursalRow[];
  comparativoMeses: FlotaComparativoSemanaRow[];
  rankingCosto: FlotaRankingCostoRow[];
}
