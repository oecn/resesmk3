export type PropiedadLocal = 'luque' | 'aregua' | 'itaugua' | 'limpio' | 'otro';

export interface ArchivoPropiedad {
  id?: number | null;
  local: PropiedadLocal;
  local_otro?: string | null;
  otorgado_por: string;
  a_favor_de: string;
  monto?: number | string | null;
  cuenta_catastral?: string | null;
  numero_finca?: string | null;
  bibliorato?: string | null;
  mes_anho?: string | null;
  fecha?: string | null;
  descripcion_ubicacion?: string | null;
  observaciones?: string | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface ArchivosPropiedadesData {
  items: ArchivoPropiedad[];
  locales: PropiedadLocal[];
  biblioratos: string[];
}
