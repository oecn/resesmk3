export type UserRole = 'admin' | 'supervisor' | 'recepcion';
export type SucursalSlug = 'aregua' | 'luque' | 'itaugua';
export type AppModuleKey =
  | 'dashboard'
  | 'estadisticas'
  | 'compras-faena'
  | 'resumenes'
  | 'recepcion'
  | 'distribuciones'
  | 'usuarios'
  | 'flota'
  | 'archivos-directorio'
  | 'contratos'
  | 'acuerdos-comerciales'
  | 'acuerdos-estadisticas'
  | 'acuerdos-valores';

export interface CurrentUser {
  id: number;
  username: string;
  nombre: string;
  rol: UserRole;
  activo: boolean;
  sucursal_permitida?: SucursalSlug | null;
  modulos_permitidos?: AppModuleKey[];
}

export interface AdminUser extends CurrentUser {
  ultimo_login?: string | null;
  creado_en?: string | null;
}
