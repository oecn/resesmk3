import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import {
  FlotaCatalogosData,
  FlotaResumenSemanalData,
} from './flota.models';
import { FlotaService } from './flota.service';
import { FmtMoneyPipe } from '../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../shared/pipes/fmt-number.pipe';
import { CombustiblePanelComponent } from './components/combustible-panel/combustible-panel.component';
import { GastosPanelComponent } from './components/gastos-panel/gastos-panel.component';
import { ResumenFlotaPanelComponent } from './components/resumen-flota-panel/resumen-flota-panel.component';
import { VehiculosPanelComponent } from './components/vehiculos-panel/vehiculos-panel.component';

type FlotaSection = 'resumen' | 'vehiculos' | 'combustible' | 'gastos';

@Component({
  selector: 'app-flota',
  standalone: true,
  imports: [CommonModule, FmtMoneyPipe, FmtNumberPipe, CombustiblePanelComponent, GastosPanelComponent, ResumenFlotaPanelComponent, VehiculosPanelComponent],
  templateUrl: './flota.component.html',
  styleUrl: './flota.component.css',
})
export class FlotaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly permissions = inject(PermissionsService);
  private readonly flotaService = inject(FlotaService);
  currentUser = this.authService.currentUser;

  flotaSeccion: FlotaSection = 'resumen';
  flotaFiltroSucursal = '';

  flotaLoading = signal(false);
  flotaError = signal('');
  flotaOk = signal('');
  flotaCatalogos = signal<FlotaCatalogosData | null>(null);
  flotaResumen = signal<FlotaResumenSemanalData | null>(null);

  canManageFlota = computed(() => this.permissions.canAccessModule(this.currentUser(), 'flota'));
  canManageFlotaProviders = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });
  canManageFlotaVehiculos = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });
  canImportFlotaCombustible = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });
  flotaSucursalBloqueada = computed(() => {
    const user = this.currentUser();
    return user?.rol === 'recepcion' ? (user.sucursal_permitida ?? null) : null;
  });
  flotaVehiculosVisibles = computed(() => {
    const blocked = String(this.flotaSucursalBloqueada() ?? '').trim().toLowerCase();
    const items = this.flotaCatalogos()?.vehiculos ?? [];
    if (!blocked) {
      return items;
    }
    return items.filter((item) => String(item.sucursal ?? '').trim().toLowerCase() === blocked);
  });
  flotaVehiculosActivos = computed(() => this.flotaVehiculosVisibles().filter((item) => item.activo));
  flotaProveedoresCombustible = computed(() => (this.flotaCatalogos()?.proveedores ?? []).filter((item) => item.activo && item.tipo === 'combustible'));
  flotaProveedoresActivos = computed(() => (this.flotaCatalogos()?.proveedores ?? []).filter((item) => item.activo));
  flotaTiposGastoActivos = computed(() => (this.flotaCatalogos()?.tiposGasto ?? []).filter((item) => item.activo && item.nombre !== 'combustible'));
  ngOnInit(): void {
    if (this.canManageFlota()) {
      this.cargarFlota();
      return;
    }
    this.flotaError.set('No tenes permiso para ver el modulo de flota.');
  }

  cambiarFlotaSeccion(seccion: FlotaSection): void {
    this.flotaSeccion = seccion;
  }

  cargarFlota(showLoading = true): void {
    if (!this.canManageFlota()) {
      return;
    }
    if (this.flotaSucursalBloqueada()) {
      this.flotaFiltroSucursal = this.flotaSucursalBloqueada() ?? '';
    }
    if (showLoading) {
      this.flotaLoading.set(true);
    }
    this.flotaError.set('');
    this.flotaService.getFlotaCatalogos().subscribe({
      next: (catalogos) => {
        this.flotaCatalogos.set(catalogos);
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo cargar el modulo de flota.');
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
    });
  }

  actualizarResumenFlota(data: FlotaResumenSemanalData | null): void {
    this.flotaResumen.set(data);
  }

  actualizarFiltroSucursal(sucursal: string): void {
    this.flotaFiltroSucursal = sucursal;
  }

  flotaMonthRowLabel(month: number, year: number): string {
    return new Intl.DateTimeFormat('es-PY', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));
  }

}
