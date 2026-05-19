import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login-page/login-page.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'compras-faena',
    loadComponent: () => import('./features/operaciones/compras-faena/compras-faena.component').then(m => m.ComprasFaenaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'resumenes',
    loadComponent: () => import('./features/resumenes/resumenes.component').then(m => m.ResumenesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'recepcion',
    loadComponent: () => import('./features/operaciones/recepcion/recepcion.component').then(m => m.RecepcionComponent),
    canActivate: [authGuard],
  },
  {
    path: 'distribuciones',
    loadComponent: () => import('./features/operaciones/distribuciones/distribuciones.component').then(m => m.DistribucionesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
    canActivate: [authGuard],
  },
  {
    path: 'flota',
    loadComponent: () => import('./features/flota/flota.component').then(m => m.FlotaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'acuerdos-comerciales',
    loadComponent: () => import('./features/acuerdos-comerciales/acuerdos-comerciales.component').then(m => m.AcuerdosComercialesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'contratos',
    loadComponent: () => import('./features/contratos/contratos.component').then(m => m.ContratosComponent),
    canActivate: [authGuard],
  },
  {
    path: 'archivos-directorio',
    loadComponent: () => import('./features/archivos-directorio/archivos-directorio.component').then(m => m.ArchivosDirectorioComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'dashboard' },
];
