import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AdminUsersComponent } from './features/admin/users/admin-users.component';
import { AcuerdosComercialesComponent } from './features/acuerdos-comerciales/acuerdos-comerciales.component';
import { ArchivosDirectorioComponent } from './features/archivos-directorio/archivos-directorio.component';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RouterPlaceholderComponent } from './router-placeholder.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginPageComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'compras-faena', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'resumenes', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'recepcion', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'distribuciones', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'usuarios', component: AdminUsersComponent, canActivate: [authGuard] },
  { path: 'flota', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'acuerdos-comerciales', component: AcuerdosComercialesComponent, canActivate: [authGuard] },
  { path: 'archivos-directorio', component: ArchivosDirectorioComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
