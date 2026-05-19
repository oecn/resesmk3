import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlotaCatalogosData, FlotaResumenSemanalData, FlotaVehiculo } from '../../flota.models';
import { FlotaService } from '../../flota.service';
import { FmtMoneyPipe } from '../../../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../../../shared/pipes/fmt-number.pipe';

@Component({
  selector: 'app-resumen-flota-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtMoneyPipe, FmtNumberPipe],
  templateUrl: './resumen-flota-panel.component.html',
  styleUrl: './resumen-flota-panel.component.css',
})
export class ResumenFlotaPanelComponent implements OnInit, OnChanges {
  @Input() catalogos: FlotaCatalogosData | null = null;
  @Input() vehiculos: FlotaVehiculo[] = [];
  @Input() sucursalBloqueada: string | null = null;
  @Input() canManageVehiculos = false;
  @Output() summaryLoaded = new EventEmitter<FlotaResumenSemanalData | null>();
  @Output() refreshCatalogos = new EventEmitter<void>();
  @Output() sucursalChanged = new EventEmitter<string>();

  flotaMes = new Date().getMonth() + 1;
  flotaAnho = new Date().getFullYear();
  flotaFechaReferencia = new Date().toISOString().slice(0, 10);
  flotaFiltroSucursal = '';
  flotaResumenVehiculoId: number | null = null;

  loading = signal(false);
  error = signal('');
  ok = signal('');
  flotaResumen = signal<FlotaResumenSemanalData | null>(null);

  flotaTotalLitros = computed(() => this.flotaResumen()?.totales.litros ?? 0);
  flotaTotalGeneral = computed(() => this.flotaResumen()?.totales.total_general ?? 0);
  flotaTotalCombustible = computed(() => this.flotaResumen()?.totales.combustible_total ?? 0);
  flotaTotalOtros = computed(() => this.flotaResumen()?.totales.otros_gastos ?? 0);
  flotaMaxVehiculoTotal = computed(() => Math.max(...(this.flotaResumen()?.items ?? []).map((item) => Number(item.total_general) || 0), 1));

  constructor(private readonly flotaService: FlotaService) {}

  ngOnInit(): void {
    this.ensureScope();
    this.cargarFlotaResumen(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ensureScope();
    if (changes['vehiculos'] && !changes['vehiculos'].firstChange && this.flotaResumenVehiculoId && !this.vehiculos.find((item) => item.id === this.flotaResumenVehiculoId)) {
      this.flotaResumenVehiculoId = null;
      this.cargarFlotaResumen();
    }
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

  actualizarSucursalFiltro(value: string): void {
    this.flotaFiltroSucursal = value;
    this.sucursalChanged.emit(value);
  }

  cargarFlotaResumen(showLoading = true): void {
    this.ensureScope();
    if (showLoading) {
      this.loading.set(true);
    }
    this.error.set('');
    this.flotaService.getFlotaResumenSemanal({
      mes: this.flotaMes,
      anho: this.flotaAnho,
      vehiculo_id: this.flotaResumenVehiculoId,
      sucursal: this.flotaFiltroSucursal || null,
    }).subscribe({
      next: (data) => {
        this.flotaResumen.set(data);
        this.summaryLoaded.emit(data);
        if (showLoading) {
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar el resumen mensual.');
        this.summaryLoaded.emit(null);
        if (showLoading) {
          this.loading.set(false);
        }
      },
    });
  }

  descargarFlotaResumenPdf(): void {
    const popup = window.open('', '_blank');
    if (!popup) {
      this.error.set('El navegador bloqueo la apertura del PDF. Permiti ventanas emergentes para este sitio.');
      return;
    }
    popup.document.write('<title>Generando PDF...</title><p style="font-family:sans-serif;padding:24px">Generando PDF mensual de flota...</p>');
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
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
        this.loading.set(false);
      },
      error: async (err) => {
        popup.close();
        this.error.set(await this.extractHttpBlobError(err, 'No se pudo generar el PDF mensual de flota.'));
        this.loading.set(false);
      },
    });
  }

  recargarTodo(): void {
    this.refreshCatalogos.emit();
    this.cargarFlotaResumen();
  }

  barWidthValue(value: number, maxValue: number): string {
    const amount = Number(value) || 0;
    return `${Math.max((amount / maxValue) * 100, 3)}%`;
  }

  vehiculoSucursalLabel(slug?: string | null): string {
    if (!slug) {
      return '-';
    }
    return this.catalogos?.sucursales.find((item) => item.slug === slug)?.nombre ?? slug;
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

  private ensureScope(): void {
    if (this.sucursalBloqueada) {
      this.flotaFiltroSucursal = this.sucursalBloqueada;
    }
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
}
