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

export interface ResumenSucursalSeleccionada {
  local: string;
  kg: number;
  cabezas: number;
  dif_kg: number;
}

export interface DistribucionResumenDetalle {
  id: number;
  lote_id: number;
  lote: string;
  fecha: string;
  local: string;
  kg: number;
  cabezas: number;
  diferencia_kg: number;
  nota: string;
}

export interface ResumenesData {
  empresas: string[];
  lotes: LoteResumen[];
  selected_lote_ids: number[];
  resumenSucursales: ResumenSucursalSeleccionada[];
  distribucionesDetalle: DistribucionResumenDetalle[];
}
