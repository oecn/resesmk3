import { SucursalSlug } from '../../core/auth/auth.models';

export interface FlotaSucursal {
  slug: SucursalSlug;
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
  sucursal?: SucursalSlug | null;
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
