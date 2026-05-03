import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DistribucionLote, DistribucionRow, DistribucionesData } from './distribuciones.models';
import { DistribucionesService } from './distribuciones.service';
import { FmtNumberPipe } from '../../../shared/pipes/fmt-number.pipe';

@Component({
  selector: 'app-distribuciones',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtNumberPipe],
  templateUrl: './distribuciones.component.html',
  styleUrl: './distribuciones.component.css',
})
export class DistribucionesComponent implements OnInit {
  private readonly distribucionesService = inject(DistribucionesService);

  localesDistribucion = ['LUQUE', 'AREGUA', 'ITAUGUA'];
  distribucionLoteId: number | null = null;
  distribucionBusqueda = '';
  mostrarTodosLotesDistribucion = false;
  distribucionEditId: number | null = null;
  distribucionDetalleId: number | null = null;
  distribucionEditModalOpen = false;
  distribucionFecha = new Date().toISOString().slice(0, 10);
  distribucionLocal = 'LUQUE';
  distribucionKg = '';
  distribucionCabezas = '';
  distribucionDifKg = '';
  distribucionNota = '';
  modalDistribucionFecha = new Date().toISOString().slice(0, 10);
  modalDistribucionLocal = 'LUQUE';
  modalDistribucionKg = '';
  modalDistribucionCabezas = '';
  modalDistribucionDifKg = '';
  modalDistribucionNota = '';
  distribucionLoading = signal(false);
  distribucionError = signal('');
  distribucionOk = signal('');
  distribuciones = signal<DistribucionesData | null>(null);

  loteDistribucionSeleccionado = computed(() => {
    const loteId = this.distribucionLoteId;
    return (this.distribuciones()?.lotes ?? []).find((lote) => lote.id === loteId) ?? null;
  });

  distribucionTotalCabezas = computed(() => {
    return (this.distribuciones()?.distribuciones ?? []).reduce((acc, row) => acc + (Number(row.cabezas) || 0), 0);
  });

  ngOnInit(): void {
    this.cargarDistribuciones();
  }

  lotesDistribucionFiltrados(): DistribucionLote[] {
    const term = this.distribucionBusqueda.trim().toLowerCase();
    const lotes = this.distribuciones()?.lotes ?? [];
    if (!term) {
      return lotes;
    }
    return lotes.filter((lote) =>
      [lote.id, lote.lote, lote.empresa, lote.fecha].some((value) => String(value ?? '').toLowerCase().includes(term)),
    );
  }

  lotesDistribucionVisibles(): DistribucionLote[] {
    const lotes = this.lotesDistribucionFiltrados();
    return this.mostrarTodosLotesDistribucion ? lotes : lotes.slice(0, 10);
  }

  distribucionLoteClass(lote: DistribucionLote): string {
    const faenado = Number(lote.faenado) || 0;
    const distribuidas = Number(lote.distribuidas) || 0;
    if (faenado <= 0) {
      return 'status-neutral';
    }
    if (distribuidas <= 0) {
      return 'status-red';
    }
    if (lote.has_zero_kg) {
      return 'status-yellow';
    }
    if (distribuidas >= faenado) {
      return 'status-green';
    }
    return 'status-yellow';
  }

  distribucionSaldo(lote: DistribucionLote): number {
    return Math.max((Number(lote.faenado) || 0) - (Number(lote.distribuidas) || 0), 0);
  }

  distribucionSaldoSeleccionado(): number {
    const lote = this.loteDistribucionSeleccionado();
    return lote ? this.distribucionSaldo(lote) : 0;
  }

  resumenDistribucionLocal(local: string): { kg: number; cabezas: number } {
    const row = (this.distribuciones()?.resumenLocal ?? []).find((item) => item.local === local);
    return {
      kg: Number(row?.kg) || 0,
      cabezas: Number(row?.cabezas) || 0,
    };
  }

  distribucionesPorLocalDetalle(local: string): DistribucionRow[] {
    return (this.distribuciones()?.distribuciones ?? []).filter((row) => row.local === local);
  }

  distribucionDetalle(): DistribucionRow | null {
    return (this.distribuciones()?.distribuciones ?? []).find((row) => row.id === this.distribucionDetalleId) ?? null;
  }
  cargarDistribuciones(loteId?: number | null, showLoading = true): void {
    if (showLoading) {
      this.distribucionLoading.set(true);
      this.distribucionError.set('');
      this.distribucionOk.set('');
    }
    this.distribucionesService.getDistribuciones(loteId ?? this.distribucionLoteId).subscribe({
      next: (data) => {
        this.distribuciones.set(data);
        this.distribucionLoteId = data.selected_lote_id;
        if (showLoading) {
          this.distribucionLoading.set(false);
        }
      },
      error: (err) => {
        this.distribucionError.set(err?.error?.error ?? 'No se pudo cargar distribuciones.');
        if (showLoading) {
          this.distribucionLoading.set(false);
        }
      },
    });
  }

  seleccionarLoteDistribucion(lote: DistribucionLote): void {
    this.distribucionLoteId = lote.id;
    this.distribucionDetalleId = null;
    this.distribucionEditModalOpen = false;
    this.limpiarDistribucionForm(false);
    this.cargarDistribuciones(lote.id, false);
  }

  toggleTodosLotesDistribucion(): void {
    this.mostrarTodosLotesDistribucion = !this.mostrarTodosLotesDistribucion;
  }

  editarDistribucion(row: DistribucionRow): void {
    this.distribucionDetalleId = row.id;
    this.distribucionEditId = row.id;
    this.modalDistribucionFecha = row.fecha;
    this.modalDistribucionLocal = row.local;
    this.modalDistribucionKg = String(Number(row.kg || 0).toFixed(2));
    this.modalDistribucionCabezas = String(Number(row.cabezas || 0));
    this.modalDistribucionDifKg = String(Number(row.diferencia_kg || 0).toFixed(2));
    this.modalDistribucionNota = row.nota ?? '';
  }

  verDistribucion(row: DistribucionRow): void {
    this.distribucionDetalleId = row.id;
  }

  seleccionarDistribucionDetalle(row: DistribucionRow): void {
    this.distribucionDetalleId = row.id;
    this.distribucionError.set('');
  }

  abrirEditorDistribucion(row: DistribucionRow): void {
    this.editarDistribucion(row);
    this.distribucionEditModalOpen = true;
  }

  editarDistribucionSeleccionada(): void {
    const row = this.distribucionDetalle();
    if (!row) {
      this.distribucionError.set('Elegi una distribucion de la tabla.');
      return;
    }
    this.abrirEditorDistribucion(row);
  }

  cerrarEditorDistribucion(): void {
    this.distribucionEditModalOpen = false;
    this.limpiarDistribucionEditForm();
  }

  borrarNotaDistribucion(row: DistribucionRow): void {
    const ok = window.confirm(`Borrar la nota de la distribucion ${row.local} del ${row.fecha}?`);
    if (!ok) {
      return;
    }
    const loteId = row.lote_id ?? this.distribucionLoteId;
    if (!loteId) {
      this.distribucionError.set('Elegi un lote con faena.');
      return;
    }
    this.distribucionLoading.set(true);
    this.distribucionError.set('');
    this.distribucionOk.set('');
    this.distribucionesService
      .saveDistribucion({
        id: row.id,
        lote_id: loteId,
        fecha: row.fecha,
        local: row.local,
        kg: row.kg,
        cabezas: row.cabezas,
        diferencia_kg: row.diferencia_kg,
        nota: '',
      })
      .subscribe({
        next: () => {
          this.distribucionOk.set('Nota borrada.');
          this.distribucionDetalleId = row.id;
          if (this.distribucionEditId === row.id) {
            this.modalDistribucionNota = '';
          }
          this.cargarDistribuciones(this.distribucionLoteId);
        },
        error: (err) => {
          this.distribucionError.set(err?.error?.error ?? 'No se pudo borrar la nota.');
          this.distribucionLoading.set(false);
        },
      });
  }

  eliminarDistribucionSeleccionada(): void {
    const row = this.distribucionDetalle();
    if (!row) {
      this.distribucionError.set('Elegi una distribucion de la tabla.');
      return;
    }
    this.eliminarDistribucion(row);
  }

  limpiarDistribucionForm(clearMessage = true): void {
    this.distribucionFecha = new Date().toISOString().slice(0, 10);
    this.distribucionLocal = 'LUQUE';
    this.distribucionKg = '';
    this.distribucionCabezas = '';
    this.distribucionDifKg = '';
    this.distribucionNota = '';
    if (clearMessage) {
      this.distribucionError.set('');
      this.distribucionOk.set('');
    }
  }

  limpiarDistribucionEditForm(): void {
    this.distribucionEditId = null;
    this.modalDistribucionFecha = new Date().toISOString().slice(0, 10);
    this.modalDistribucionLocal = 'LUQUE';
    this.modalDistribucionKg = '';
    this.modalDistribucionCabezas = '';
    this.modalDistribucionDifKg = '';
    this.modalDistribucionNota = '';
  }

  guardarDistribucion(): void {
    if (!this.distribucionLoteId) {
      this.distribucionError.set('Elegi un lote con faena.');
      return;
    }
    this.distribucionLoading.set(true);
    this.distribucionError.set('');
    this.distribucionOk.set('');
    this.distribucionesService
      .saveDistribucion({
        id: null,
        lote_id: this.distribucionLoteId,
        fecha: this.distribucionFecha,
        local: this.distribucionLocal,
        kg: this.distribucionKg,
        cabezas: this.distribucionCabezas,
        diferencia_kg: this.distribucionDifKg,
        nota: this.distribucionNota,
      })
      .subscribe({
        next: () => {
          this.distribucionOk.set('Distribucion cargada.');
          this.limpiarDistribucionForm(false);
          this.cargarDistribuciones(this.distribucionLoteId);
          },
        error: (err) => {
          this.distribucionError.set(err?.error?.error ?? 'No se pudo guardar la distribucion.');
          this.distribucionLoading.set(false);
        },
      });
  }

  guardarDistribucionEditada(): void {
    const row = this.distribucionDetalle();
    if (!row || !this.distribucionEditId) {
      this.distribucionError.set('Elegi una distribucion de la tabla.');
      return;
    }
    const loteId = row.lote_id ?? this.distribucionLoteId;
    if (!loteId) {
      this.distribucionError.set('Elegi un lote con faena.');
      return;
    }
    this.distribucionLoading.set(true);
    this.distribucionError.set('');
    this.distribucionOk.set('');
    this.distribucionesService
      .saveDistribucion({
        id: this.distribucionEditId,
        lote_id: loteId,
        fecha: this.modalDistribucionFecha,
        local: this.modalDistribucionLocal,
        kg: this.modalDistribucionKg,
        cabezas: this.modalDistribucionCabezas,
        diferencia_kg: this.modalDistribucionDifKg,
        nota: this.modalDistribucionNota,
      })
      .subscribe({
        next: () => {
          this.distribucionOk.set('Distribucion actualizada.');
          this.distribucionEditModalOpen = false;
          this.limpiarDistribucionEditForm();
          this.cargarDistribuciones(this.distribucionLoteId);
          },
        error: (err) => {
          this.distribucionError.set(err?.error?.error ?? 'No se pudo guardar la distribucion.');
          this.distribucionLoading.set(false);
        },
      });
  }

  eliminarDistribucion(row: DistribucionRow): void {
    const ok = window.confirm(`Eliminar distribucion ${row.local} del ${row.fecha}?`);
    if (!ok) {
      return;
    }
    this.distribucionLoading.set(true);
    this.distribucionError.set('');
    this.distribucionOk.set('');
    this.distribucionesService.deleteDistribucion(row.id).subscribe({
      next: () => {
        this.distribucionOk.set('Distribucion eliminada.');
        this.cargarDistribuciones(this.distribucionLoteId);
      },
      error: (err) => {
        this.distribucionError.set(err?.error?.error ?? 'No se pudo eliminar la distribucion.');
        this.distribucionLoading.set(false);
      },
    });
  }

}
