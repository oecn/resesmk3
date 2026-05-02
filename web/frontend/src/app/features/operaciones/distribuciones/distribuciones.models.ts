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
