import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { RouterPlaceholderComponent } from './router-placeholder.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: RouterPlaceholderComponent },
  { path: 'dashboard', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'compras-faena', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'resumenes', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'recepcion', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'distribuciones', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'usuarios', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'flota', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: 'acuerdos-comerciales', component: RouterPlaceholderComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
