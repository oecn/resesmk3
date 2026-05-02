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
