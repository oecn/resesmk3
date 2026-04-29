export type UserRole = 'admin' | 'supervisor' | 'recepcion';
export type SucursalSlug = 'aregua' | 'luque' | 'itaugua';

export interface CurrentUser {
  id: number;
  username: string;
  nombre: string;
  rol: UserRole;
  activo: boolean;
  sucursal_permitida?: SucursalSlug | null;
}

export interface AdminUser extends CurrentUser {
  ultimo_login?: string | null;
  creado_en?: string | null;
}
