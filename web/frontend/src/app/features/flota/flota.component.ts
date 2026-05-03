import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AppModuleKey } from '../../core/auth/auth.models';
import {
  FlotaCatalogosData,
  FlotaResumenSemanalData,
} from './flota.models';
import { FlotaService } from './flota.service';
import { FmtMoneyPipe } from '../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../shared/pipes/fmt-number.pipe';
import { CombustiblePanelComponent } from './components/combustible-panel/combustible-panel.component';
import { GastosPanelComponent } from './components/gastos-panel/gastos-panel.component';
import { VehiculosPanelComponent } from './components/vehiculos-panel/vehiculos-panel.component';

type FlotaSection = 'resumen' | 'vehiculos' | 'combustible' | 'gastos';

@Component({
  selector: 'app-flota',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtMoneyPipe, FmtNumberPipe, CombustiblePanelComponent, GastosPanelComponent, VehiculosPanelComponent],
  templateUrl: './flota.component.html',
  styleUrl: './flota.component.css',
})
export class FlotaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly flotaService = inject(FlotaService);
  currentUser = this.authService.currentUser;

  flotaSeccion: FlotaSection = 'resumen';
  flotaMes = new Date().getMonth() + 1;
  flotaAnho = new Date().getFullYear();
  flotaFechaReferencia = new Date().toISOString().slice(0, 10);
  flotaFiltroSucursal = '';
  flotaResumenVehiculoId: number | null = null;

  flotaLoading = signal(false);
  flotaError = signal('');
  flotaOk = signal('');
  flotaCatalogos = signal<FlotaCatalogosData | null>(null);
  flotaResumen = signal<FlotaResumenSemanalData | null>(null);

  canManageFlota = computed(() => {
    const role = this.currentUser()?.rol;
    return (role === 'admin' || role === 'supervisor' || role === 'recepcion') && this.hasModule('flota');
  });
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
  flotaTotalLitros = computed(() => this.flotaResumen()?.totales.litros ?? 0);
  flotaTotalGeneral = computed(() => this.flotaResumen()?.totales.total_general ?? 0);
  flotaTotalCombustible = computed(() => this.flotaResumen()?.totales.combustible_total ?? 0);
  flotaTotalOtros = computed(() => this.flotaResumen()?.totales.otros_gastos ?? 0);
  flotaMaxVehiculoTotal = computed(() => Math.max(...(this.flotaResumen()?.items ?? []).map((item) => Number(item.total_general) || 0), 1));

  ngOnInit(): void {
    if (this.canManageFlota()) {
      this.cargarFlota();
      return;
    }
    this.flotaError.set('No tenes permiso para ver el modulo de flota.');
  }

  private hasModule(module: AppModuleKey): boolean {
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

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  barWidthValue(value: number, maxValue: number): string {
    const amount = Number(value) || 0;
    return `${Math.max((amount / maxValue) * 100, 3)}%`;
  }

  cambiarFlotaSeccion(seccion: FlotaSection): void {
    this.flotaSeccion = seccion;
  }

  shiftFlotaMonth(offset: number): void {
    const current = new Date(this.flotaAnho, this.flotaMes - 1, 1);
    current.setMonth(current.getMonth() + offset);
    this.flotaMes = current.getMonth() + 1;
    this.flotaAnho = current.getFullYear();
    this.flotaFechaReferencia = this.toIsoDate(current);
    this.cargarFlotaResumen();
  }

  actualizarFlotaMesDesdeFecha(value: string): void {
    this.flotaFechaReferencia = value;
    if (!value) {
      return;
    }
    const selected = new Date(`${value}T00:00:00`);
    if (Number.isNaN(selected.getTime())) {
      return;
    }
    this.flotaMes = selected.getMonth() + 1;
    this.flotaAnho = selected.getFullYear();
    this.cargarFlotaResumen();
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
        const vehiculosVisibles = this.flotaVehiculosVisibles();
        if (this.flotaResumenVehiculoId && !vehiculosVisibles.find((item) => item.id === this.flotaResumenVehiculoId)) {
          this.flotaResumenVehiculoId = null;
        }
        this.cargarFlotaResumen(false);
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

  cargarFlotaResumen(showLoading = true): void {
    if (!this.canManageFlota()) {
      return;
    }
    if (showLoading) {
      this.flotaLoading.set(true);
    }
    this.flotaService.getFlotaResumenSemanal({
      mes: this.flotaMes,
      anho: this.flotaAnho,
      vehiculo_id: this.flotaResumenVehiculoId,
      sucursal: this.flotaFiltroSucursal || null,
    }).subscribe({
      next: (data) => {
        this.flotaResumen.set(data);
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo cargar el resumen mensual.');
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
    });
  }

  descargarFlotaResumenPdf(): void {
    if (!this.canManageFlota()) {
      return;
    }
    const popup = window.open('', '_blank');
    if (!popup) {
      this.flotaError.set('El navegador bloqueo la apertura del PDF. Permiti ventanas emergentes para este sitio.');
      return;
    }
    popup.document.write('<title>Generando PDF...</title><p style="font-family:sans-serif;padding:24px">Generando PDF mensual de flota...</p>');
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.flotaService.getFlotaResumenMensualPdf({
      mes: this.flotaMes,
      anho: this.flotaAnho,
      vehiculo_id: this.flotaResumenVehiculoId,
      sucursal: this.flotaFiltroSucursal || null,
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        popup.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.flotaLoading.set(false);
      },
      error: async (err) => {
        popup.close();
        this.flotaError.set(await this.extractHttpBlobError(err, 'No se pudo generar el PDF mensual de flota.'));
        this.flotaLoading.set(false);
      },
    });
  }

  private async extractHttpBlobError(err: unknown, fallback: string): Promise<string> {
    const blob = (err as { error?: unknown } | null)?.error;
    if (!(blob instanceof Blob)) {
      return (err as { error?: { error?: string } } | null)?.error?.error ?? fallback;
    }
    try {
      const text = await blob.text();
      if (!text) {
        return fallback;
      }
      const parsed = JSON.parse(text) as { error?: string };
      return parsed?.error || fallback;
    } catch {
      return fallback;
    }
  }

  vehiculoSucursalLabel(slug?: string | null): string {
    if (!slug) {
      return '-';
    }
    return this.flotaCatalogos()?.sucursales.find((item) => item.slug === slug)?.nombre ?? slug;
  }

  vehiculoDisplayLabel(vehiculo: {
    id?: number | null;
    codigo?: string | null;
    chapa?: string | null;
    nombre?: string | null;
  }): string {
    const codigo = String(vehiculo.codigo ?? '').trim();
    const chapa = String(vehiculo.chapa ?? '').trim();
    const nombre = String(vehiculo.nombre ?? '').trim();
    const principal = codigo || chapa || (vehiculo.id ? `Vehiculo #${vehiculo.id}` : 'Vehiculo');
    if (nombre && nombre.toLowerCase() !== principal.toLowerCase()) {
      return `${principal} - ${nombre}`;
    }
    return nombre || principal;
  }

  flotaMonthTitle(): string {
    return new Intl.DateTimeFormat('es-PY', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(this.flotaAnho, this.flotaMes - 1, 1));
  }

  flotaMonthSubtitle(): string {
    const start = new Date(this.flotaAnho, this.flotaMes - 1, 1);
    const end = new Date(this.flotaAnho, this.flotaMes, 0);
    const startLabel = new Intl.DateTimeFormat('es-PY', {
      day: 'numeric',
      month: 'long',
    }).format(start);
    const endLabel = new Intl.DateTimeFormat('es-PY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(end);
    return `Del ${startLabel} al ${endLabel}`;
  }

  flotaMonthRowLabel(month: number, year: number): string {
    return new Intl.DateTimeFormat('es-PY', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));
  }

}
