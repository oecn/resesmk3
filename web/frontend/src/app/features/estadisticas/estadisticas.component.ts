import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FmtMoneyPipe } from '../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../shared/pipes/fmt-number.pipe';
import { EstadisticasData } from './estadisticas.models';
import { EstadisticasService } from './estadisticas.service';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtMoneyPipe, FmtNumberPipe],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css',
})
export class EstadisticasComponent implements OnInit {
  desde = '';
  hasta = '';
  loading = signal(false);
  error = signal('');
  data = signal<EstadisticasData | null>(null);

  distribucionPct = computed(() => {
    const kpis = this.data()?.kpis;
    if (!kpis || !kpis.reces_faenadas) {
      return 0;
    }
    return (Number(kpis.reces_distribuidas) / Number(kpis.reces_faenadas)) * 100;
  });

  constructor(private readonly estadisticasService: EstadisticasService) {}

  ngOnInit(): void {
    this.setMesActual();
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.loading.set(true);
    this.error.set('');
    this.estadisticasService.getEstadisticas(this.desde, this.hasta).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudieron cargar estadisticas.');
        this.loading.set(false);
      },
    });
  }

  setMesActual(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.desde = this.toIsoDate(start);
    this.hasta = this.toIsoDate(end);
  }

  setMesAnterior(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    this.desde = this.toIsoDate(start);
    this.hasta = this.toIsoDate(end);
  }

  limpiarPeriodo(): void {
    this.desde = '';
    this.hasta = '';
    this.cargarEstadisticas();
  }

  barWidth(value: number | string | null | undefined, max: number): string {
    const amount = Number(value) || 0;
    if (max <= 0) {
      return '0%';
    }
    return `${Math.max(Math.min((amount / max) * 100, 100), 4)}%`;
  }

  maxProveedorKg(): number {
    return Math.max(...(this.data()?.proveedores ?? []).map((row) => Number(row.kg_distribuidos) || 0), 1);
  }

  maxSucursalKg(): number {
    return Math.max(...(this.data()?.sucursales ?? []).map((row) => Number(row.kg) || 0), 1);
  }

  alertaClass(severidad: string): string {
    return `alert-card severity-${String(severidad || 'baja').toLowerCase()}`;
  }

  alertaValor(tipo: string, valor: number | string | null | undefined): string {
    const amount = Number(valor) || 0;
    if (tipo === 'costo_kg_alto' || tipo === 'proveedor_concentrado') {
      return `${amount.toFixed(2)}%`;
    }
    return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(amount);
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
