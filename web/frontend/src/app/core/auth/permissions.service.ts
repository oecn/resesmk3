import { Injectable } from '@angular/core';
import { AppModuleKey, CurrentUser, UserRole } from './auth.models';

const DEFAULT_MODULES_BY_ROLE: Record<UserRole, AppModuleKey[]> = {
  admin: [
    'dashboard',
    'compras-faena',
    'resumenes',
    'recepcion',
    'distribuciones',
    'usuarios',
    'flota',
    'archivos-directorio',
    'acuerdos-comerciales',
    'contratos',
  ],
  supervisor: [
    'dashboard',
    'compras-faena',
    'resumenes',
    'recepcion',
    'distribuciones',
    'flota',
    'archivos-directorio',
    'acuerdos-comerciales',
    'contratos',
  ],
  recepcion: ['recepcion', 'flota'],
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  recepcion: 'Recepcion',
};

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  canAccessModule(user: CurrentUser | null | undefined, module: AppModuleKey): boolean {
    if (!user) {
      return false;
    }
    if (Array.isArray(user.modulos_permitidos)) {
      return user.modulos_permitidos.includes(module);
    }
    return DEFAULT_MODULES_BY_ROLE[user.rol]?.includes(module) ?? false;
  }

  roleLabel(user: CurrentUser | null | undefined): string {
    return user ? ROLE_LABELS[user.rol] ?? 'Invitado' : 'Invitado';
  }

  initials(user: CurrentUser | null | undefined): string {
    const name = user?.nombre?.trim() || user?.username?.trim() || '';
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'RC';
  }
}
