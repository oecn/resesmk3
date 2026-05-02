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
