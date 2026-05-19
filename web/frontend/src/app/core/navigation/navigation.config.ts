import { AppModuleKey } from '../auth/auth.models';

export interface NavigationItem {
  key: AppModuleKey;
  route: string;
  label: string;
  title: string;
}

export const APP_NAV_ITEMS: NavigationItem[] = [
  { key: 'dashboard', route: '/dashboard', label: 'Dashboard', title: 'Dashboard' },
  { key: 'compras-faena', route: '/compras-faena', label: 'Compras y faena', title: 'Compras y faena' },
  { key: 'resumenes', route: '/resumenes', label: 'Resumenes', title: 'Resumenes' },
  { key: 'distribuciones', route: '/distribuciones', label: 'Distribuciones', title: 'Distribuciones' },
  { key: 'flota', route: '/flota', label: 'Flota', title: 'Flota' },
  { key: 'recepcion', route: '/recepcion', label: 'Recepcion', title: 'Recepcion' },
  { key: 'usuarios', route: '/usuarios', label: 'Usuarios', title: 'Usuarios' },
  { key: 'acuerdos-comerciales', route: '/acuerdos-comerciales', label: 'Acuerdos', title: 'Acuerdos comerciales' },
  { key: 'contratos', route: '/contratos', label: 'Contratos', title: 'Contratos' },
  { key: 'archivos-directorio', route: '/archivos-directorio', label: 'Archivos', title: 'Archivos de directorio' },
];

export const DEFAULT_APP_MODULE: AppModuleKey = 'dashboard';

export const ROUTE_TO_MODULE = APP_NAV_ITEMS.reduce<Record<string, AppModuleKey>>((acc, item) => {
  acc[item.route] = item.key;
  return acc;
}, {});

export const MODULE_TO_ROUTE = APP_NAV_ITEMS.reduce<Record<AppModuleKey, string>>((acc, item) => {
  acc[item.key] = item.route;
  return acc;
}, {} as Record<AppModuleKey, string>);
