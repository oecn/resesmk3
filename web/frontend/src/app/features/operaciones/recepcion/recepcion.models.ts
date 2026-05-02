export type RecepcionSucursalSlug = 'aregua' | 'luque' | 'itaugua';

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

export interface RecepcionData {
  fecha: string;
  sucursal: string;
  local: string;
  distribuciones: RecepcionDistribucion[];
  menudencias: RecepcionMenudencia[];
}
