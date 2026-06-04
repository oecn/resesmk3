import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoteResumen, ResumenesData } from './resumenes.models';
import { ResumenesService } from './resumenes.service';
import { FmtMoneyPipe } from '../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../shared/pipes/fmt-number.pipe';

@Component({
  selector: 'app-resumenes',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtMoneyPipe, FmtNumberPipe],
  templateUrl: './resumenes.component.html',
  styleUrl: './resumenes.component.css',
})
export class ResumenesComponent implements OnInit {
  resumenFiltro = 'Todos';
  resumenEmpresa = 'Todas';
  resumenDesde = '';
  resumenHasta = '';
  resumenBusqueda = '';
  resumenMaxFilas = signal(20);
  resumenSeleccionados = new Set<number>();
  resumenLoading = signal(false);
  error = signal('');
  resumenes = signal<ResumenesData | null>(null);
  distribucionesDetalleOpen = signal(false);
  compraDetalleOpen = signal(false);
  compraDetalleLote = signal<LoteResumen | null>(null);

  resumenLotesFiltrados = computed(() => this.filtrarResumenLotes(true));

  resumenCostoKgPromedio = computed(() => {
    const selectedRows = this.resumenSeleccionados.size > 0
      ? this.resumenLotesFiltrados().filter((row) => this.resumenSeleccionados.has(row.id))
      : this.resumenLotesFiltrados()
          .filter((row) => (Number(row.faenado) || 0) > 0
            && (Number(row.distribuido) || 0) === (Number(row.faenado) || 0)
            && (Number(row.rend_pct) || 0) > 45)
          .slice(0, 4);
    const totales = selectedRows.reduce(
      (acc, row) => ({
        monto: acc.monto + (Number(row.monto) || 0),
        kg: acc.kg + (Number(row.kg) || 0),
      }),
      { monto: 0, kg: 0 },
    );
    if (totales.kg <= 0) {
      return 0;
    }
    return totales.monto / totales.kg;
  });

  resumenSeleccionTotal = computed(() => {
    const rows = this.resumenes()?.resumenSucursales ?? [];
    return rows.reduce(
      (acc, row) => ({
        kg: acc.kg + (Number(row.kg) || 0),
        cabezas: acc.cabezas + (Number(row.cabezas) || 0),
        dif_kg: acc.dif_kg + (Number(row.dif_kg) || 0),
      }),
      { kg: 0, cabezas: 0, dif_kg: 0 },
    );
  });

  resumenTotalFiltrado = computed(() => this.filtrarResumenLotes(false).length);

  constructor(private readonly resumenesService: ResumenesService) {}

  ngOnInit(): void {
    this.cargarResumenes();
  }

  cargarResumenes(showLoading = true): void {
    if (showLoading) {
      this.resumenLoading.set(true);
    }
    this.error.set('');
    this.resumenesService.getResumenes(Array.from(this.resumenSeleccionados)).subscribe({
      next: (data) => {
        this.resumenes.set(data);
        if (showLoading) {
          this.resumenLoading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar resumenes.');
        if (showLoading) {
          this.resumenLoading.set(false);
        }
      },
    });
  }

  descargarResumenesPdf(): void {
    const loteIds = Array.from(this.resumenSeleccionados);
    if (loteIds.length === 0) {
      this.error.set('Selecciona al menos un lote para generar el PDF.');
      return;
    }
    this.resumenLoading.set(true);
    this.error.set('');
    this.resumenesService.getResumenesPdf(loteIds).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank', 'noopener');
        if (!opened) {
          this.error.set('El navegador bloqueo la apertura del PDF. Permiti ventanas emergentes para este sitio.');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.resumenLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudo generar el PDF de resumenes.');
        this.resumenLoading.set(false);
      },
    });
  }

  toggleResumenSeleccion(lote: LoteResumen): void {
    if (this.resumenSeleccionados.has(lote.id)) {
      this.resumenSeleccionados.delete(lote.id);
    } else {
      this.resumenSeleccionados.add(lote.id);
    }
    this.resumenSeleccionados = new Set(this.resumenSeleccionados);
    this.cargarResumenes(false);
  }

  marcarResumenesComoCerrados(): void {
    const loteIds = Array.from(this.resumenSeleccionados);
    if (loteIds.length === 0) {
      this.error.set('Selecciona al menos un lote para marcarlo como cerrado.');
      return;
    }
    this.resumenLoading.set(true);
    this.error.set('');
    this.resumenesService.marcarResumenesCerrados(loteIds).subscribe({
      next: () => {
        this.cargarResumenes(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo marcar el lote como cerrado.');
        this.resumenLoading.set(false);
      },
    });
  }

  toggleResumenCerrado(lote: LoteResumen, event?: Event): void {
    event?.stopPropagation();
    this.resumenLoading.set(true);
    this.error.set('');
    this.resumenesService.marcarResumenesCerrados([lote.id], !lote.cerrado).subscribe({
      next: () => {
        this.cargarResumenes(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo actualizar el estado del lote.');
        this.resumenLoading.set(false);
      },
    });
  }

  cargarDiezMasResumenes(): void {
    this.resumenMaxFilas.update((value) => (Number(value) || 20) + 10);
  }

  cargarTodosResumenes(): void {
    this.resumenMaxFilas.set(this.resumenTotalFiltrado());
  }

  abrirDistribucionesDetalle(): void {
    if (this.resumenSeleccionados.size === 0) {
      this.error.set('Selecciona al menos un lote para ver sus distribuciones.');
      return;
    }
    this.resumenLoading.set(true);
    this.error.set('');
    this.resumenesService.getResumenes(Array.from(this.resumenSeleccionados)).subscribe({
      next: (data) => {
        this.resumenes.set(data);
        this.resumenLoading.set(false);
        this.distribucionesDetalleOpen.set(true);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudieron cargar las distribuciones del lote.');
        this.resumenLoading.set(false);
      },
    });
  }

  cerrarDistribucionesDetalle(): void {
    this.distribucionesDetalleOpen.set(false);
  }

  abrirCompraDetalle(lote: LoteResumen, event?: Event): void {
    event?.stopPropagation();
    this.compraDetalleLote.set(lote);
    this.compraDetalleOpen.set(true);
  }

  cerrarCompraDetalle(): void {
    this.compraDetalleOpen.set(false);
    this.compraDetalleLote.set(null);
  }

  compraDetalleTipos(lote: LoteResumen): Array<{ tipo: string; cantidad: number; peso: number }> {
    return [
      { tipo: 'TOR', cantidad: Number(lote.cantidad_tor) || 0, peso: Number(lote.peso_promedio_tor) || 0 },
      { tipo: 'NOV', cantidad: Number(lote.cantidad_nov) || 0, peso: Number(lote.peso_promedio_nov) || 0 },
      { tipo: 'VAC', cantidad: Number(lote.cantidad_vac) || 0, peso: Number(lote.peso_promedio_vac) || 0 },
      { tipo: 'VAQ', cantidad: Number(lote.cantidad_vaq) || 0, peso: Number(lote.peso_promedio_vaq) || 0 },
    ].filter((row) => row.cantidad > 0 || row.peso > 0);
  }

  distribucionesDetalleLotesLabel(): string {
    const selected = this.resumenLotesFiltrados().filter((lote) => this.resumenSeleccionados.has(lote.id));
    if (selected.length === 1) {
      return selected[0].lote;
    }
    return `${selected.length} lotes seleccionados`;
  }

  resumenLoteClass(lote: LoteResumen): string[] {
    const classes: string[] = [];
    const rend = Number(lote.rend_pct) || Number(lote.pct_distribuido) || 0;
    if (rend > 53) {
      classes.push('status-green');
    } else if (rend > 0) {
      classes.push('status-red');
    } else {
      classes.push('status-neutral');
    }
    if (lote.cerrado) {
      classes.push('resumen-cerrado');
    }
    return classes;
  }

  private filtrarResumenLotes(aplicarLimite: boolean): LoteResumen[] {
    const data = this.resumenes();
    if (!data) {
      return [];
    }
    const term = this.resumenBusqueda.trim().toLowerCase();
    const desde = this.resumenDesde || '';
    const hasta = this.resumenHasta || '';
    const rows = data.lotes.filter((lote) => {
      if (this.resumenFiltro === 'Pendientes' && !((Number(lote.faenado) || 0) > 0 && (Number(lote.distribuido) || 0) < (Number(lote.faenado) || 0))) {
        return false;
      }
      if (this.resumenFiltro === 'Completados' && !((Number(lote.faenado) || 0) > 0 && (Number(lote.distribuido) || 0) === (Number(lote.faenado) || 0))) {
        return false;
      }
      if (this.resumenEmpresa !== 'Todas' && lote.empresa !== this.resumenEmpresa) {
        return false;
      }
      if (desde && lote.fecha < desde) {
        return false;
      }
      if (hasta && lote.fecha > hasta) {
        return false;
      }
      if (term && ![lote.lote, lote.empresa, lote.fecha].some((value) => String(value ?? '').toLowerCase().includes(term))) {
        return false;
      }
      return true;
    });
    return aplicarLimite ? rows.slice(0, Number(this.resumenMaxFilas()) || 20) : rows;
  }
}
