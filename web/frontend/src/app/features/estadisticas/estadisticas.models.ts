export interface EstadisticasKpis {
  lotes: number;
  reces_compradas: number;
  reces_faenadas: number;
  reces_distribuidas: number;
  kg_distribuidos: number;
  kg_compra: number;
  monto_total: number;
  costo_kg_promedio: number;
  rendimiento_promedio: number;
  lotes_pendientes: number;
  lotes_completados: number;
  lotes_kg_cero: number;
}

export interface EstadisticaProveedor {
  empresa: string;
  lotes: number;
  reces_compradas: number;
  kg_distribuidos: number;
  monto_total: number;
  costo_kg: number;
  rendimiento: number;
  participacion_pct: number;
}

export interface EstadisticaSucursal {
  local: string;
  reces: number;
  kg: number;
  dif_kg: number;
  filas_kg_cero: number;
  desvio_pct: number;
  participacion_pct: number;
}

export interface EstadisticaLote {
  id: number;
  lote: string;
  empresa: string;
  fecha: string;
  faenado: number;
  distribuido: number;
  kg: number;
  kgcompra: number;
  monto: number;
  costokg: number;
  rend_pct: number;
  reces_pendientes?: number;
}

export interface AlertaGestion {
  tipo: string;
  severidad: string;
  titulo: string;
  valor: number;
  detalle: string;
}

export interface ClasificacionCompra {
  tipo: string;
  cantidad: number;
  participacion_pct: number;
}

export interface EstadisticasData {
  kpis: EstadisticasKpis;
  proveedores: EstadisticaProveedor[];
  sucursales: EstadisticaSucursal[];
  mejoresLotes: EstadisticaLote[];
  alertas: EstadisticaLote[];
  alertasGestion: AlertaGestion[];
  clasificacionCompras: ClasificacionCompra[];
}
