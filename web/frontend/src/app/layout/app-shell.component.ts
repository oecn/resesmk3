import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AppModuleKey } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';
import { PermissionsService } from '../core/auth/permissions.service';
import {
  APP_NAV_ITEMS,
  DEFAULT_APP_MODULE,
  MODULE_TO_ROUTE,
  ROUTE_TO_MODULE,
} from '../core/navigation/navigation.config';
import { PreferencesService } from '../core/preferences/preferences.service';
import { ShellTopbarComponent } from './shell-topbar.component';
import { SidebarNavComponent } from './sidebar-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarNavComponent, ShellTopbarComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly permissions = inject(PermissionsService);
  private readonly preferences = inject(PreferencesService);
  private loadedUserKey = '';

  vista: AppModuleKey = DEFAULT_APP_MODULE;
  viewMenuOpen = false;
  darkMode = false;
  currentUser = this.authService.currentUser;

  userDisplayName = computed(() => this.currentUser()?.nombre || 'Sin sesion');
  userRoleLabel = computed(() => this.permissions.roleLabel(this.currentUser()));
  userInitials = computed(() => this.permissions.initials(this.currentUser()));

  constructor(private readonly router: Router) {
    effect(() => {
      const user = this.currentUser();
      if (!user) {
        this.loadedUserKey = '';
        return;
      }
      const userKey = String(user.id ?? user.username ?? user.nombre ?? '');
      if (this.loadedUserKey === userKey) {
        return;
      }
      this.loadedUserKey = userKey;
      this.ensureVistaPermitida();
      this.syncRouteFromVista(true);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.darkMode = this.preferences.getDarkMode();
    this.vista = this.preferences.getPreferredModule() ?? DEFAULT_APP_MODULE;
    this.syncVistaFromRoute(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncVistaFromRoute(event.urlAfterRedirects);
        if (this.currentUser()) {
          this.ensureVistaPermitida();
        }
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearCurrentUser();
        this.router.navigateByUrl('/login', { replaceUrl: true });
      },
      error: () => {
        this.authService.clearCurrentUser();
        this.router.navigateByUrl('/login', { replaceUrl: true });
      },
    });
  }

  toggleViewMenu(): void {
    this.viewMenuOpen = !this.viewMenuOpen;
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    this.preferences.setDarkMode(this.darkMode);
  }

  closeViewMenu(): void {
    this.viewMenuOpen = false;
  }

  cambiarVista(vista: AppModuleKey): void {
    if (!this.canAccess(vista)) {
      this.closeViewMenu();
      return;
    }
    this.vista = vista;
    this.preferences.setPreferredModule(vista);
    this.syncRouteFromVista();
    this.closeViewMenu();
  }

  canViewDashboard(): boolean {
    return this.canAccess('dashboard');
  }

  canManageComprasFaena(): boolean {
    return this.canAccess('compras-faena');
  }

  canViewResumenes(): boolean {
    return this.canAccess('resumenes');
  }

  canManageRecepcion(): boolean {
    return this.canAccess('recepcion');
  }

  canManageDistribuciones(): boolean {
    return this.canAccess('distribuciones');
  }

  canManageUsers(): boolean {
    return this.canAccess('usuarios');
  }

  canManageFlota(): boolean {
    return this.canAccess('flota');
  }

  canViewAcuerdos(): boolean {
    return this.canAccess('acuerdos-comerciales');
  }

  canViewContratos(): boolean {
    return this.canAccess('contratos');
  }

  canViewArchivosDirectorio(): boolean {
    return this.canAccess('archivos-directorio');
  }

  private canAccess(module: AppModuleKey): boolean {
    return this.permissions.canAccessModule(this.currentUser(), module);
  }

  private syncVistaFromRoute(url: string): void {
    const path = this.normalizeRoute(url);
    if ((path === '/' || path === '/dashboard') && this.vista !== DEFAULT_APP_MODULE) {
      return;
    }
    const vista = ROUTE_TO_MODULE[path === '/' ? '/dashboard' : path];
    if (vista && vista !== this.vista) {
      this.vista = vista;
    }
  }

  private syncRouteFromVista(replaceUrl = false): void {
    const route = MODULE_TO_ROUTE[this.vista] ?? MODULE_TO_ROUTE[DEFAULT_APP_MODULE];
    const current = this.normalizeRoute(this.router.url);
    if (current !== route) {
      this.router.navigateByUrl(route, { replaceUrl });
    }
  }

  private firstAllowedView(): AppModuleKey {
    return APP_NAV_ITEMS.find((item) => this.canAccess(item.key))?.key ?? DEFAULT_APP_MODULE;
  }

  private ensureVistaPermitida(): void {
    if (this.canAccess(this.vista)) {
      return;
    }
    this.vista = this.firstAllowedView();
    this.syncRouteFromVista(true);
  }

  private normalizeRoute(url: string): string {
    return `/${String(url || '').split('?')[0].split('#')[0].replace(/^\/+/, '')}`;
  }
}
