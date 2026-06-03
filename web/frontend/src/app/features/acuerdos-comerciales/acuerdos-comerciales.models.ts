export interface AcuerdoComercial {
  id: number;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_ruc?: string | null;
  proveedor_telefono?: string | null;
  proveedor_email?: string | null;
  titulo: string;
  retorno_porcentaje: number;
  duracion_meses?: number | null;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  estado_renovacion?: 'vigente' | 'por_renovar' | 'en_negociacion' | 'renovado' | 'no_renovado' | 'vencido';
  acuerdo_origen_id?: number | null;
  renovado_por_acuerdo_id?: number | null;
  observaciones?: string | null;
  activo: boolean;
  creado_en?: string | null;
  ubicaciones_count: number;
  punteras_count: number;
  ubicaciones: AcuerdoUbicacion[];
}

export interface ProveedorComercial {
  id: number;
  nombre: string;
  ruc?: string | null;
  telefono?: string | null;
  email?: string | null;
  activo: boolean;
  creado_en?: string | null;
  acuerdos_count?: number;
}

export interface AcuerdoUbicacion {
  id?: number;
  acuerdo_id?: number;
  sucursal: 'luque' | 'aregua' | 'itaugua';
  tipo_espacio: 'puntera' | 'pestana' | 'tramo_gondola' | 'isla' | 'espacio_gondola_frio';
  ubicacion: string;
  codigo?: string | null;
  bloque?: string | null;
  numero?: number | null;
  valor_gs?: number | string | null;
  detalle?: string | null;
  orden?: number;
  tentativa?: boolean;
}

export interface MapaUbicacion {
  id: number;
  sucursal: 'luque' | 'aregua' | 'itaugua';
  codigo: string;
  ubicacion?: string | null;
  bloque: string;
  numero: number;
  tipo_espacio: 'puntera' | 'pestana' | 'tramo_gondola' | 'isla' | 'espacio_gondola_frio';
  valor_gs?: number | string | null;
  detalle?: string | null;
  acuerdo_id?: number | null;
  vigencia_hasta?: string | null;
  estado_renovacion?: string | null;
  proveedor_nombre?: string | null;
}

export interface MapaUbicacionesResponse {
  items: MapaUbicacion[];
}

export interface MapaUbicacionValorResponse extends MapaUbicacion {
  acuerdos_actualizados: number;
}

export interface AcuerdosComercialesResponse {
  items: AcuerdoComercial[];
}

export interface AcuerdoHistorialCambio {
  campo: string;
  antes: unknown;
  despues: unknown;
}

export interface AcuerdoHistorial {
  id: number;
  acuerdo_id: number;
  accion: string;
  usuario?: string | null;
  cambios: AcuerdoHistorialCambio[];
  anterior?: unknown;
  nuevo?: unknown;
  creado_en?: string | null;
}

export interface AcuerdoHistorialResponse {
  items: AcuerdoHistorial[];
}

export interface AcuerdoCobranza {
  id?: number | null;
  acuerdo_id: number;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_ruc?: string | null;
  titulo: string;
  retorno_porcentaje: number;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  estado_renovacion?: string | null;
  activo: boolean;
  periodo_anho: number;
  periodo_mes: number;
  tipo_facturacion: 'alquiler' | 'porcentaje_venta' | 'ambos';
  cobertura_tipos?: number;
  numero_factura: string;
  monto_factura: number;
  fecha_factura?: string | null;
  cobrado: boolean;
  fecha_cobro?: string | null;
  forma_cobro?: string | null;
  observaciones?: string | null;
  actualizado_en?: string | null;
}

export interface AcuerdosCobranzasResponse {
  periodo: { mes: number; anho: number };
  totales: {
    facturas: number;
    cobradas: number;
    pendientes: number;
    total_facturado: number;
    total_cobrado: number;
    total_pendiente: number;
  };
  items: AcuerdoCobranza[];
}

export interface AcuerdosCobranzasAnualResponse {
  anho: number;
  meses: Array<{
    mes: number;
    facturas: number;
    cobradas: number;
    pendientes: number;
    total_facturado: number;
    total_cobrado: number;
    porcentaje_facturas: number;
    porcentaje_monto: number;
  }>;
  proveedores: Array<{
    proveedor_id: number;
    proveedor_nombre: string;
    meses: Array<{
      mes: number;
      facturas: number;
      cobradas: number;
      porcentaje: number;
      total_facturado: number;
      total_cobrado: number;
    }>;
  }>;
}

export interface AcuerdosEstadisticasResponse {
  periodo: { mes: number; anho: number };
  resumen: {
    acuerdos_activos: number;
    negociaciones: number;
    vencen_30: number;
    vencen_60: number;
    vencen_90: number;
    vencidos: number;
    ingreso_mensual_contratado: number;
    ingreso_anualizado: number;
    valor_riesgo_90: number;
    total_facturado: number;
    total_cobrado: number;
    total_pendiente: number;
    facturas_cargadas: number;
    facturas_cobradas: number;
    acuerdos_sin_facturacion: number;
    porcentaje_cobranza_monto: number;
    concentracion_top5: number;
  };
  top_proveedores: Array<{
    proveedor_id: number;
    proveedor_nombre: string;
    valor_mensual: number;
    ubicaciones: number;
  }>;
  mix_espacios: Array<{
    sucursal: string;
    tipo_espacio: string;
    valor_mensual: number;
    ubicaciones: number;
  }>;
  ocupacion: Array<{
    sucursal: string;
    tipo_espacio: string;
    bloque?: string | null;
    total: number;
    ocupadas: number;
    libres: number;
    potencial_libre: number;
  }>;
  vencimientos: Array<{
    id: number;
    titulo: string;
    proveedor_nombre: string;
    vigencia_hasta?: string | null;
    valor_mensual: number;
    dias: number;
  }>;
}

export interface ProveedoresComercialesResponse {
  items: ProveedorComercial[];
}

export interface AcuerdoComercialPayload {
  id?: number | null;
  proveedor: {
    id?: number | null;
    nombre: string;
    ruc?: string;
    telefono?: string;
    email?: string;
  };
  titulo: string;
  retorno_porcentaje: number | string;
  duracion_meses?: number | string | null;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  estado_renovacion?: string;
  acuerdo_origen_id?: number | null;
  observaciones?: string;
  activo: boolean;
  ubicaciones: AcuerdoUbicacion[];
}

export interface ProveedorComercialPayload {
  id?: number | null;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

export interface AcuerdoCobranzaPayload {
  acuerdo_id: number;
  periodo_mes: number;
  periodo_anho: number;
  tipo_facturacion: 'alquiler' | 'porcentaje_venta' | 'ambos';
  numero_factura: string;
  monto_factura?: number | string | null;
  fecha_factura?: string | null;
  cobrado: boolean;
  fecha_cobro?: string | null;
  forma_cobro?: string | null;
  observaciones?: string | null;
}

export interface AcuerdosUbicacionesImportResponse {
  ok: boolean;
  leidas: number;
  creadas: number;
  actualizadas: number;
  proveedores_creados: number;
  acuerdos_creados: number;
}
