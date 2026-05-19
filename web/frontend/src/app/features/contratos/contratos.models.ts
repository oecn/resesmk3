export interface Contrato {
  id?: number | null;
  inicio_contrato: string;
  duracion_meses?: number | string | null;
  contexto?: string | null;
  clausulas_importantes?: string | null;
  monto_contrato?: number | string | null;
  ofrece_contrato: string;
  contratante: string;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface ContratosResponse {
  items: Contrato[];
}
