import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FmtMoneyPipe } from '../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../shared/pipes/fmt-number.pipe';
import { DashboardData, DistribucionLocal, MenudenciaSucursal, TopMenudencia } from './dashboard.models';
import { DashboardFeatureService } from './dashboard.service';

type OptionalKpiKey =
  | 'lotes'
  | 'reces_compradas'
  | 'reces_faenadas'
  | 'reces_distribuidas'
  | 'kg_distribuidos'
  | 'monto_total'
  | 'costo_kg_promedio';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtNumberPipe, FmtMoneyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly kpiStorageKey = 'reces-dashboard-kpis';
  data = signal<DashboardData | null>(null);
  loading = signal(false);
  error = signal('');
  ultimaActualizacion = signal('');
  desde = '';
  hasta = '';
  periodoSeleccionado = 'mes-actual';
  busqueda = '';
  kpiMenuOpen = false;
  optionalKpis: Array<{ key: OptionalKpiKey; label: string }> = [
    { key: 'lotes', label: 'Lotes' },
    { key: 'reces_compradas', label: 'Reces compradas' },
    { key: 'reces_faenadas', label: 'Reces faenadas' },
    { key: 'reces_distribuidas', label: 'Reces distribuidas' },
    { key: 'kg_distribuidos', label: 'Kg distribuidos' },
    { key: 'monto_total', label: 'Monto total' },
    { key: 'costo_kg_promedio', label: 'Costo kg promedio' },
  ];
  visibleKpis: Record<OptionalKpiKey, boolean> = {
    lotes: true,
    reces_compradas: true,
    reces_faenadas: true,
    reces_distribuidas: true,
    kg_distribuidos: true,
    monto_total: true,
    costo_kg_promedio: true,
  };

  lotesFiltrados = computed(() => {
    const dashboard = this.data();
    if (!dashboard) {
      return [];
    }
    const term = this.busqueda.trim().toLowerCase();
    if (!term) {
      return dashboard.lotes;
    }
    return dashboard.lotes.filter((lote) =>
      [lote.lote, lote.empresa, lote.fecha].some((value) => String(value ?? '').toLowerCase().includes(term)),
    );
  });
  maxDistribucionKg = computed(() => Math.max(...(this.data()?.distribucionesPorLocal ?? []).map((row) => Number(row.kg) || 0), 1));
  maxMenudenciaKg = computed(() => Math.max(...(this.data()?.menudenciasPorSucursal ?? []).map((row) => Number(row.kg) || 0), 1));
  maxTopMenudenciaKg = computed(() => Math.max(...(this.data()?.topMenudencias ?? []).map((row) => Number(row.kg) || 0), 1));

  constructor(private readonly dashboardService: DashboardFeatureService) {}

  ngOnInit(): void {
    this.cargarPreferenciasKpis();
    this.setPeriodoSeleccionado();
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.dashboardService.getDashboard(this.desde, this.hasta).subscribe({
      next: (data) => {
        this.data.set(data);
        this.ultimaActualizacion.set(new Date().toLocaleString('es-PY'));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar el tablero.');
        this.loading.set(false);
      },
    });
  }

  aplicarPeriodo(): void {
    this.setPeriodoSeleccionado();
    this.cargar();
  }

  limpiarFiltros(): void {
    this.periodoSeleccionado = 'todos';
    this.desde = '';
    this.hasta = '';
    this.busqueda = '';
    this.cargar();
  }

  toggleKpi(key: OptionalKpiKey, visible: boolean): void {
    this.visibleKpis = { ...this.visibleKpis, [key]: visible };
    localStorage.setItem(this.kpiStorageKey, JSON.stringify(this.visibleKpis));
  }

  toggleKpiMenu(): void {
    this.kpiMenuOpen = !this.kpiMenuOpen;
  }

  barWidth(row: DistribucionLocal | MenudenciaSucursal | TopMenudencia, maxValue: number): string {
    const kg = Number(row.kg) || 0;
    return `${Math.max((kg / maxValue) * 100, 3)}%`;
  }

  rangoTexto(): string {
    if (this.desde && this.hasta) {
      return `${this.desde} al ${this.hasta}`;
    }
    if (this.desde) {
      return `Desde ${this.desde}`;
    }
    if (this.hasta) {
      return `Hasta ${this.hasta}`;
    }
    return 'Todos los registros';
  }

  private cargarPreferenciasKpis(): void {
    const raw = localStorage.getItem(this.kpiStorageKey);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<Record<OptionalKpiKey, boolean>>;
      this.visibleKpis = { ...this.visibleKpis, ...parsed };
    } catch {
      localStorage.removeItem(this.kpiStorageKey);
    }
  }

  private setPeriodoSeleccionado(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    let start: Date | null = null;
    let end: Date | null = null;
    switch (this.periodoSeleccionado) {
      case 'mes-actual':
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        break;
      case 'mes-anterior':
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0);
        break;
      case 'trimestre-actual': {
        const quarterStartMonth = Math.floor(month / 3) * 3;
        start = new Date(year, quarterStartMonth, 1);
        end = new Date(year, quarterStartMonth + 3, 0);
        break;
      }
      case 'trimestre-anterior': {
        const quarterStartMonth = Math.floor(month / 3) * 3 - 3;
        start = new Date(year, quarterStartMonth, 1);
        end = new Date(year, quarterStartMonth + 3, 0);
        break;
      }
      case 'ano-actual':
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        break;
      case 'ano-anterior':
        start = new Date(year - 1, 0, 1);
        end = new Date(year - 1, 11, 31);
        break;
    }
    this.desde = start ? this.toIsoDate(start) : '';
    this.hasta = end ? this.toIsoDate(end) : '';
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
