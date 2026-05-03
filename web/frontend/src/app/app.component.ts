import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

type AppView =
  | 'dashboard'
  | 'compras-faena'
  | 'resumenes'
  | 'recepcion'
  | 'distribuciones'
  | 'usuarios'
  | 'flota'
  | 'acuerdos-comerciales'
  | 'archivos-directorio';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly themeStorageKey = 'reces-dashboard-theme';
  private readonly viewStorageKey = 'reces-dashboard-view';
  private loadedUserKey = '';
  vista: AppView = 'dashboard';
  viewMenuOpen = false;
  darkMode = false;
  authLoading = signal(true);
  authError = signal('');
  currentUser = this.authService.currentUser;
  private readonly routeToView: Record<string, AppView> = {
    '/dashboard': 'dashboard',
    '/compras-faena': 'compras-faena',
    '/resumenes': 'resumenes',
    '/recepcion': 'recepcion',
    '/distribuciones': 'distribuciones',
    '/usuarios': 'usuarios',
    '/flota': 'flota',
    '/acuerdos-comerciales': 'acuerdos-comerciales',
    '/archivos-directorio': 'archivos-directorio',
  };
  private readonly viewToRoute: Record<AppView, string> = {
    dashboard: '/dashboard',
    'compras-faena': '/compras-faena',
    resumenes: '/resumenes',
    recepcion: '/recepcion',
    distribuciones: '/distribuciones',
    usuarios: '/usuarios',
    flota: '/flota',
    'acuerdos-comerciales': '/acuerdos-comerciales',
    'archivos-directorio': '/archivos-directorio',
  };

  userDisplayName = computed(() => this.currentUser()?.nombre || 'Sin sesion');

  userRoleLabel = computed(() => {
    const role = this.currentUser()?.rol;
    if (role === 'admin') {
      return 'Administrador';
    }
    if (role === 'supervisor') {
      return 'Supervisor';
    }
    if (role === 'recepcion') {
      return 'Recepcion';
    }
    return 'Invitado';
  });

  userInitials = computed(() => {
    const name = this.currentUser()?.nombre?.trim() || this.currentUser()?.username?.trim() || '';
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'RC';
  });

  canManageComprasFaena = computed(() => {
    const role = this.currentUser()?.rol;
    return (role === 'admin' || role === 'supervisor') && this.hasModule('compras-faena');
  });

  canManageDistribuciones = computed(() => {
    const role = this.currentUser()?.rol;
    return (role === 'admin' || role === 'supervisor') && this.hasModule('distribuciones');
  });

  canViewDashboard = computed(() => {
    const role = this.currentUser()?.rol;
    return (role === 'admin' || role === 'supervisor') && this.hasModule('dashboard');
  });

  canViewResumenes = computed(() => {
    const role = this.currentUser()?.rol;
    return (role === 'admin' || role === 'supervisor') && this.hasModule('resumenes');
  });

  canViewAcuerdos = computed(() => {
    const role = this.currentUser()?.rol;
    return (role === 'admin' || role === 'supervisor') && this.hasModule('acuerdos-comerciales');
  });

  canViewArchivosDirectorio = computed(() => this.hasModule('archivos-directorio'));

  canManageRecepcion = computed(() => {
    const role = this.currentUser()?.rol;
    return (role === 'admin' || role === 'supervisor' || role === 'recepcion') && this.hasModule('recepcion');
  });

  canManageUsers = computed(() => this.currentUser()?.rol === 'admin' && this.hasModule('usuarios'));
  canManageFlota = computed(() => {
    const role = this.currentUser()?.rol;
    return (role === 'admin' || role === 'supervisor' || role === 'recepcion') && this.hasModule('flota');
  });

  private hasModule(module: AppView): boolean {
    const user = this.currentUser();
    if (!user) {
      return false;
    }
    const modules = user.modulos_permitidos;
    if (Array.isArray(modules)) {
      return modules.includes(module);
    }
    const role = user.rol;
    if (role === 'admin') {
      return true;
    }
    if (role === 'supervisor') {
      return module !== 'usuarios';
    }
    if (role === 'recepcion') {
      return module === 'recepcion' || module === 'flota';
    }
    return false;
  }

  constructor(private readonly router: Router) {
    effect(() => {
      const user = this.currentUser();
      const loading = this.authLoading();
      if (!user) {
        this.loadedUserKey = '';
        return;
      }
      if (loading) {
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
    this.cargarPreferenciaTema();
    this.cargarVistaPreferida();
    this.syncVistaFromRoute(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncVistaFromRoute(event.urlAfterRedirects);
        if (this.currentUser()) {
          this.ensureVistaPermitida();
        }
      }
    });
    this.restoreSession();
  }

  restoreSession(): void {
    this.authLoading.set(true);
    this.authError.set('');
    this.authService.getCurrentUser().subscribe({
      next: () => {
        this.authLoading.set(false);
      },
      error: (err) => {
        this.authService.clearCurrentUser();
        this.authLoading.set(false);
        if (err?.status && err.status !== 401) {
          this.authError.set(err?.error?.error ?? 'No se pudo verificar la sesion.');
        }
      },
    });
  }

  logout(): void {
    this.authLoading.set(true);
    this.authError.set('');
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearCurrentUser();
        this.authLoading.set(false);
        this.router.navigateByUrl('/login', { replaceUrl: true });
      },
      error: (err) => {
        this.authError.set(err?.error?.error ?? 'No se pudo cerrar sesion.');
        this.authLoading.set(false);
      },
    });
  }

  private syncVistaFromRoute(url: string): void {
    const path = `/${String(url || '').split('?')[0].split('#')[0].replace(/^\/+/, '')}`;
    if ((path === '/' || path === '/dashboard') && this.vista !== 'dashboard') {
      return;
    }
    const vista = this.routeToView[path === '/' ? '/dashboard' : path];
    if (vista && vista !== this.vista) {
      this.vista = vista;
    }
  }

  private syncRouteFromVista(replaceUrl = false): void {
    const route = this.viewToRoute[this.vista] ?? '/dashboard';
    const current = `/${this.router.url.split('?')[0].split('#')[0].replace(/^\/+/, '')}`;
    if (current !== route) {
      this.router.navigateByUrl(route, { replaceUrl });
    }
  }

  private firstAllowedView(): AppView {
    if (this.canViewDashboard()) {
      return 'dashboard';
    }
    if (this.canManageRecepcion()) {
      return 'recepcion';
    }
    if (this.canManageFlota()) {
      return 'flota';
    }
    if (this.canManageComprasFaena()) {
      return 'compras-faena';
    }
    if (this.canManageDistribuciones()) {
      return 'distribuciones';
    }
    if (this.canViewResumenes()) {
      return 'resumenes';
    }
    if (this.canViewAcuerdos()) {
      return 'acuerdos-comerciales';
    }
    if (this.canViewArchivosDirectorio()) {
      return 'archivos-directorio';
    }
    if (this.canManageUsers()) {
      return 'usuarios';
    }
    return 'dashboard';
  }

  private ensureVistaPermitida(): void {
    if (this.vista === 'usuarios' && !this.canManageUsers()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
      return;
    }
    if (this.vista === 'dashboard' && !this.canViewDashboard()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
      return;
    }
    if (this.vista === 'resumenes' && !this.canViewResumenes()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
      return;
    }
    if (this.vista === 'acuerdos-comerciales' && !this.canViewAcuerdos()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
      return;
    }
    if (this.vista === 'archivos-directorio' && !this.canViewArchivosDirectorio()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
      return;
    }
    if (this.vista === 'compras-faena' && !this.canManageComprasFaena()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
      return;
    }
    if (this.vista === 'distribuciones' && !this.canManageDistribuciones()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
      return;
    }
    if (this.vista === 'flota' && !this.canManageFlota()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
      return;
    }
    if (this.vista === 'recepcion' && !this.canManageRecepcion()) {
      this.vista = this.firstAllowedView();
      this.syncRouteFromVista(true);
    }
  }

  toggleViewMenu(): void {
    this.viewMenuOpen = !this.viewMenuOpen;
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem(this.themeStorageKey, this.darkMode ? 'dark' : 'light');
  }

  closeViewMenu(): void {
    this.viewMenuOpen = false;
  }

  private cargarPreferenciaTema(): void {
    this.darkMode = localStorage.getItem(this.themeStorageKey) === 'dark';
  }

  private cargarVistaPreferida(): void {
    const stored = localStorage.getItem(this.viewStorageKey) as AppView | null;
    if (stored && this.viewToRoute[stored]) {
      this.vista = stored;
    }
  }

  cambiarVista(vista: AppView): void {
    if (vista === 'dashboard' && !this.canViewDashboard()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'resumenes' && !this.canViewResumenes()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'acuerdos-comerciales' && !this.canViewAcuerdos()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'archivos-directorio' && !this.canViewArchivosDirectorio()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'usuarios' && !this.canManageUsers()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'flota' && !this.canManageFlota()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'compras-faena' && !this.canManageComprasFaena()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'distribuciones' && !this.canManageDistribuciones()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'recepcion' && !this.canManageRecepcion()) {
      this.closeViewMenu();
      return;
    }
    this.vista = vista;
    localStorage.setItem(this.viewStorageKey, vista);
    this.syncRouteFromVista();
    this.closeViewMenu();
  }


}
