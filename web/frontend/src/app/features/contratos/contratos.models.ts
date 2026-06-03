export interface Contrato {
  id?: number | null;
  nombre_documento?: string | null;
  tipo_documento?: string | null;
  categoria?: string | null;
  naturaleza?: string | null;
  sucursal?: string | null;
  entidad_relacionada?: string | null;
  responsable_interno?: string | null;
  estado_documento?: string | null;
  inicio_contrato: string;
  fecha_fin?: string | null;
  duracion_meses?: number | string | null;
  contexto?: string | null;
  clausulas_importantes?: string | null;
  monto_contrato?: number | string | null;
  ofrece_contrato: string;
  contratante: string;
  archivo_url?: string | null;
  bibliorato?: string | null;
  localidad?: string | null;
  cuenta_catastral?: string | null;
  finca_matricula?: string | null;
  superficie?: string | null;
  distrito?: string | null;
  departamento?: string | null;
  marca?: string | null;
  modelo?: string | null;
  anho_vehiculo?: string | null;
  chapa?: string | null;
  chasis?: string | null;
  motor?: string | null;
  estado_transferencia?: string | null;
  medio_publicidad?: string | null;
  programa_publicidad?: string | null;
  horario_publicidad?: string | null;
  frecuencia_publicidad?: string | null;
  club_equipo?: string | null;
  ubicacion_marca?: string | null;
  beneficios_pactados?: string | null;
  entidad_emisora?: string | null;
  numero_documento?: string | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface ContratosResponse {
  items: Contrato[];
}
