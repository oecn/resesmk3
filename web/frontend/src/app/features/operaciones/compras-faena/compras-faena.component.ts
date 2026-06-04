import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompraFaenaLote, ComprasFaenaData } from './compras-faena.models';
import { ComprasFaenaService } from './compras-faena.service';
import { FmtMoneyPipe } from '../../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../../shared/pipes/fmt-number.pipe';

type AnimalClassCode = 'TOR' | 'NOV' | 'VAC' | 'VAQ';

interface AnimalClassRow {
  tipo: AnimalClassCode | '';
  cantidad: string;
  pesoPromedio: string;
}

@Component({
  selector: 'app-compras-faena',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtMoneyPipe, FmtNumberPipe],
  templateUrl: './compras-faena.component.html',
  styleUrl: './compras-faena.component.css',
})
export class ComprasFaenaComponent implements OnInit {
  private readonly comprasFaenaService = inject(ComprasFaenaService);
  readonly animalClassOptions: AnimalClassCode[] = ['TOR', 'NOV', 'VAC', 'VAQ'];

  compraBusqueda = '';
  compraLoteId: number | null = null;
  compraLoteManualOverride = false;
  compraDesde = '';
  compraHasta = '';
  compraMaxFilas = signal(20);
  compraEditModalOpen = false;
  faenaModalOpen = false;
  compraLote = '';
  compraEmpresa = 'Corral';
  compraFecha = new Date().toISOString().slice(0, 10);
  compraCantidad = '';
  compraCantidadVac = '';
  compraCantidadTor = '';
  compraCantidadNov = '';
  compraCantidadVaq = '';
  compraPesoPromedioVac = '';
  compraPesoPromedioTor = '';
  compraPesoPromedioNov = '';
  compraPesoPromedioVaq = '';
  compraAnimalRows: AnimalClassRow[] = [{ tipo: '', cantidad: '', pesoPromedio: '' }];
  compraMonto = '';
  compraPesoKg = '';
  modalCompraLote = '';
  modalCompraEmpresa = 'Corral';
  modalCompraFecha = new Date().toISOString().slice(0, 10);
  modalCompraCantidad = '';
  modalCompraCantidadVac = '';
  modalCompraCantidadTor = '';
  modalCompraCantidadNov = '';
  modalCompraCantidadVaq = '';
  modalCompraPesoPromedioVac = '';
  modalCompraPesoPromedioTor = '';
  modalCompraPesoPromedioNov = '';
  modalCompraPesoPromedioVaq = '';
  modalCompraAnimalRows: AnimalClassRow[] = [{ tipo: '', cantidad: '', pesoPromedio: '' }];
  modalCompraMonto = '';
  modalCompraPesoKg = '';
  faenaFecha = new Date().toISOString().slice(0, 10);
  faenaCantidad = '';
  faenaNota = '';
  faenaAjusteFecha = new Date().toISOString().slice(0, 10);
  faenaAjusteCantidad = '';
  faenaAjusteNota = '';
  compraLoading = signal(false);
  error = signal('');
  comprasFaena = signal<ComprasFaenaData | null>(null);

  compraLotesFiltrados = computed(() => {
    return this.filtrarCompraLotes(true);
  });

  compraTotalFiltrado = computed(() => this.filtrarCompraLotes(false).length);

  compraLoteSeleccionado = computed(() => {
    const loteId = this.compraLoteId;
    return (this.comprasFaena()?.lotes ?? []).find((lote) => lote.id === loteId) ?? null;
  });

  ngOnInit(): void {
    this.setComprasFaenaRangoDefault();
    this.cargarComprasFaena();
  }

  cargarDiezMasCompras(): void {
    this.compraMaxFilas.update((value) => (Number(value) || 20) + 10);
  }

  cargarTodasCompras(): void {
    this.compraMaxFilas.set(this.compraTotalFiltrado());
  }

  private filtrarCompraLotes(aplicarLimite: boolean): CompraFaenaLote[] {
    const term = this.compraBusqueda.trim().toLowerCase();
    const desde = this.compraDesde || '';
    const hasta = this.compraHasta || '';
    const lotes = this.comprasFaena()?.lotes ?? [];
    const rows = lotes.filter((lote) =>
      (!desde || lote.fecha >= desde)
      && (!hasta || lote.fecha <= hasta)
      && (!term || [lote.id, lote.lote, lote.empresa, lote.fecha].some((value) => String(value ?? '').toLowerCase().includes(term))),
    );
    return aplicarLimite ? rows.slice(0, Number(this.compraMaxFilas()) || 20) : rows;
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  cargarComprasFaena(loteId?: number | null): void {
    this.compraLoading.set(true);
    this.error.set('');
    this.comprasFaenaService.getComprasFaena(loteId ?? this.compraLoteId).subscribe({
      next: (data) => {
        this.comprasFaena.set(data);
        this.compraLoteId = data.selected_lote_id;
        this.sincronizarAjusteFaena();
        if (!this.compraEmpresa && data.empresas.length > 0) {
          this.compraEmpresa = data.empresas[0];
        }
        this.compraLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar compras y faena.');
        this.compraLoading.set(false);
      },
    });
  }

  seleccionarCompraLote(lote: CompraFaenaLote): void {
    this.compraLoteId = lote.id;
    this.cargarComprasFaena(lote.id);
  }

  compraLoteClass(lote: CompraFaenaLote): string {
    const cantidad = Number(lote.cantidad) || 0;
    const faenado = Number(lote.faenado) || 0;
    if (faenado <= 0) {
      return 'status-neutral';
    }
    if (faenado >= cantidad) {
      return 'status-green';
    }
    return 'status-yellow';
  }

  limpiarCompraForm(): void {
    this.compraLote = '';
    this.compraLoteManualOverride = false;
    this.compraEmpresa = this.comprasFaena()?.empresas[0] ?? 'Corral';
    this.compraFecha = new Date().toISOString().slice(0, 10);
    this.compraCantidad = '';
    this.compraCantidadVac = '';
    this.compraCantidadTor = '';
    this.compraCantidadNov = '';
    this.compraCantidadVaq = '';
    this.compraPesoPromedioVac = '';
    this.compraPesoPromedioTor = '';
    this.compraPesoPromedioNov = '';
    this.compraPesoPromedioVaq = '';
    this.compraAnimalRows = [{ tipo: '', cantidad: '', pesoPromedio: '' }];
    this.compraMonto = '';
    this.compraPesoKg = '';
  }

  setComprasFaenaRangoDefault(): void {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.compraDesde = this.toIsoDate(start);
    this.compraHasta = this.toIsoDate(end);
  }

  limpiarComprasFaenaRango(): void {
    this.compraDesde = '';
    this.compraHasta = '';
  }

  private weekdayAbbrev(weekday: number): string {
    return ['LUN', 'MAR', 'MIER', 'JUEV', 'VIER', 'SAB', 'DOM'][weekday] ?? 'DIA';
  }

  private buildLoteCode(fechaTxt: string, empresa: string, cantidadTxt: string): string {
    if (!fechaTxt || !empresa || !cantidadTxt) {
      return '';
    }
    const [year, month, day] = fechaTxt.split('-').map((value) => Number(value));
    if (!year || !month || !day) {
      return '';
    }
    const cantidad = Number(String(cantidadTxt).replace(',', '.'));
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return '';
    }
    const empresaToken = empresa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!empresaToken) {
      return '';
    }
    const fecha = new Date(year, month - 1, day);
    const mondayBasedWeekday = (fecha.getDay() + 6) % 7;
    const dia = this.weekdayAbbrev(mondayBasedWeekday);
    const fechaToken = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
    return `${dia}${fechaToken}${empresaToken}${cantidad}`;
  }

  maybeAutofillCompraLote(): void {
    if (this.compraLoteManualOverride) {
      return;
    }
    const codigo = this.buildLoteCode(this.compraFecha, this.compraEmpresa, this.compraCantidad);
    if (codigo) {
      this.compraLote = codigo;
    }
  }

  marcarCompraLoteManual(): void {
    this.compraLoteManualOverride = true;
  }

  forzarAutofillCompraLote(): void {
    this.compraLoteManualOverride = false;
    this.maybeAutofillCompraLote();
  }

  animalClassAvailable(tipo: AnimalClassCode, rows: AnimalClassRow[], currentIndex: number): boolean {
    return !rows.some((row, index) => index !== currentIndex && row.tipo === tipo);
  }

  addAnimalClassRow(rows: AnimalClassRow[]): void {
    if (rows.length < this.animalClassOptions.length) {
      rows.push({ tipo: '', cantidad: '', pesoPromedio: '' });
    }
  }

  removeAnimalClassRow(rows: AnimalClassRow[], index: number): void {
    rows.splice(index, 1);
    if (!rows.length) {
      rows.push({ tipo: '', cantidad: '', pesoPromedio: '' });
    }
  }

  handleAnimalClassEnter(event: Event, rows: AnimalClassRow[]): void {
    event.preventDefault();
    this.addAnimalClassRow(rows);
  }

  private animalRowsToPayload(rows: AnimalClassRow[]) {
    const data = {
      cantidad_vac: '0',
      cantidad_tor: '0',
      cantidad_nov: '0',
      cantidad_vaq: '0',
      peso_promedio_vac: '0',
      peso_promedio_tor: '0',
      peso_promedio_nov: '0',
      peso_promedio_vaq: '0',
    };
    for (const row of rows) {
      if (!row.tipo) {
        continue;
      }
      if (row.tipo === 'VAC') {
        data.cantidad_vac = row.cantidad || '0';
        data.peso_promedio_vac = row.pesoPromedio || '0';
      } else if (row.tipo === 'TOR') {
        data.cantidad_tor = row.cantidad || '0';
        data.peso_promedio_tor = row.pesoPromedio || '0';
      } else if (row.tipo === 'NOV') {
        data.cantidad_nov = row.cantidad || '0';
        data.peso_promedio_nov = row.pesoPromedio || '0';
      } else if (row.tipo === 'VAQ') {
        data.cantidad_vaq = row.cantidad || '0';
        data.peso_promedio_vaq = row.pesoPromedio || '0';
      }
    }
    return data;
  }

  private validateAnimalRows(rows: AnimalClassRow[], cantidadTotalTxt: string): string {
    const cantidadTotal = Number(String(cantidadTotalTxt || '').replace(',', '.')) || 0;
    const usados = new Set<string>();
    let suma = 0;
    let tieneTipo = false;

    for (const row of rows) {
      const cantidad = Number(String(row.cantidad || '').replace(',', '.')) || 0;
      const peso = Number(String(row.pesoPromedio || '').replace(',', '.')) || 0;
      const tieneDatos = Boolean(row.tipo) || cantidad > 0 || peso > 0;
      if (!tieneDatos) {
        continue;
      }
      if (!row.tipo) {
        return 'Elegi el tipo de animal para cada fila cargada.';
      }
      if (usados.has(row.tipo)) {
        return `El tipo ${row.tipo} esta repetido.`;
      }
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return `La cantidad de ${row.tipo} debe ser un entero mayor a 0.`;
      }
      if (peso < 0) {
        return `El peso promedio de ${row.tipo} no puede ser negativo.`;
      }
      usados.add(row.tipo);
      suma += cantidad;
      tieneTipo = true;
    }

    if (!tieneTipo) {
      return 'Carga al menos un tipo de animal.';
    }
    if (suma !== cantidadTotal) {
      return `La suma de tipos (${suma}) debe ser igual a la cantidad comprada (${cantidadTotal}).`;
    }
    return '';
  }

  private animalRowsFromLote(lote: CompraFaenaLote): AnimalClassRow[] {
    const rows: AnimalClassRow[] = [
      { tipo: 'TOR' as AnimalClassCode, cantidad: String(lote.cantidad_tor ?? 0), pesoPromedio: String(lote.peso_promedio_tor ?? 0) },
      { tipo: 'NOV' as AnimalClassCode, cantidad: String(lote.cantidad_nov ?? 0), pesoPromedio: String(lote.peso_promedio_nov ?? 0) },
      { tipo: 'VAC' as AnimalClassCode, cantidad: String(lote.cantidad_vac ?? 0), pesoPromedio: String(lote.peso_promedio_vac ?? 0) },
      { tipo: 'VAQ' as AnimalClassCode, cantidad: String(lote.cantidad_vaq ?? 0), pesoPromedio: String(lote.peso_promedio_vaq ?? 0) },
    ].filter((row) => (Number(row.cantidad) || 0) > 0 || (Number(row.pesoPromedio) || 0) > 0);
    return rows.length ? rows : [{ tipo: '', cantidad: '', pesoPromedio: '' }];
  }

  guardarCompraLote(): void {
    const validationError = this.validateAnimalRows(this.compraAnimalRows, this.compraCantidad);
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    const animalPayload = this.animalRowsToPayload(this.compraAnimalRows);
    this.compraLoading.set(true);
    this.error.set('');
    this.comprasFaenaService.saveCompraLote({
      id: null,
      lote: this.compraLote,
      empresa: this.compraEmpresa,
      fecha: this.compraFecha,
      cantidad: this.compraCantidad,
      monto: this.compraMonto,
      peso_compra_kg: this.compraPesoKg,
      ...animalPayload,
    }).subscribe({
      next: () => {
        this.limpiarCompraForm();
        this.cargarComprasFaena();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar el lote.');
        this.compraLoading.set(false);
      },
    });
  }

  abrirEditarCompra(): void {
    const lote = this.compraLoteSeleccionado();
    if (!lote) {
      this.error.set('Elegi un lote de la tabla.');
      return;
    }
    this.modalCompraLote = lote.lote;
    this.modalCompraEmpresa = lote.empresa;
    this.modalCompraFecha = lote.fecha;
    this.modalCompraCantidad = String(lote.cantidad);
    this.modalCompraCantidadVac = String(lote.cantidad_vac ?? 0);
    this.modalCompraCantidadTor = String(lote.cantidad_tor ?? 0);
    this.modalCompraCantidadNov = String(lote.cantidad_nov ?? 0);
    this.modalCompraCantidadVaq = String(lote.cantidad_vaq ?? 0);
    this.modalCompraPesoPromedioVac = String(lote.peso_promedio_vac ?? 0);
    this.modalCompraPesoPromedioTor = String(lote.peso_promedio_tor ?? 0);
    this.modalCompraPesoPromedioNov = String(lote.peso_promedio_nov ?? 0);
    this.modalCompraPesoPromedioVaq = String(lote.peso_promedio_vaq ?? 0);
    this.modalCompraAnimalRows = this.animalRowsFromLote(lote);
    this.modalCompraMonto = String(lote.monto ?? 0);
    this.modalCompraPesoKg = String(lote.peso_compra_kg ?? 0);
    this.compraEditModalOpen = true;
  }

  guardarCompraEditada(): void {
    const lote = this.compraLoteSeleccionado();
    if (!lote) {
      this.error.set('Elegi un lote de la tabla.');
      return;
    }
    const validationError = this.validateAnimalRows(this.modalCompraAnimalRows, this.modalCompraCantidad);
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    const animalPayload = this.animalRowsToPayload(this.modalCompraAnimalRows);
    this.compraLoading.set(true);
    this.error.set('');
    this.comprasFaenaService.saveCompraLote({
      id: lote.id,
      lote: this.modalCompraLote,
      empresa: this.modalCompraEmpresa,
      fecha: this.modalCompraFecha,
      cantidad: this.modalCompraCantidad,
      monto: this.modalCompraMonto,
      peso_compra_kg: this.modalCompraPesoKg,
      ...animalPayload,
    }).subscribe({
      next: () => {
        this.compraEditModalOpen = false;
        this.cargarComprasFaena(lote.id);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo actualizar el lote.');
        this.compraLoading.set(false);
      },
    });
  }

  eliminarCompraLote(): void {
    const lote = this.compraLoteSeleccionado();
    if (!lote) {
      this.error.set('Elegi un lote de la tabla.');
      return;
    }
    if ((Number(lote.faenado) || 0) > 0) {
      this.error.set('No se puede eliminar un lote que ya fue faenado.');
      return;
    }
    const ok = window.confirm(`Eliminar el lote ${lote.lote}? Se borrara la compra y todo registro asociado si aun no fue faenado.`);
    if (!ok) {
      return;
    }
    this.compraLoading.set(true);
    this.error.set('');
    this.comprasFaenaService.deleteCompraLote({ id: lote.id }).subscribe({
      next: () => {
        this.compraLoteId = null;
        this.cargarComprasFaena(null);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo eliminar el lote.');
        this.compraLoading.set(false);
      },
    });
  }

  abrirRegistrarFaena(): void {
    if (!this.compraLoteSeleccionado()) {
      this.error.set('Elegi un lote de la tabla.');
      return;
    }
    this.faenaFecha = new Date().toISOString().slice(0, 10);
    this.faenaCantidad = '';
    this.faenaNota = '';
    this.faenaModalOpen = true;
  }

  private sincronizarAjusteFaena(): void {
    const lote = this.compraLoteSeleccionado();
    const faenas = this.comprasFaena()?.faenas ?? [];
    const ultimaFaena = faenas.length > 0 ? faenas[faenas.length - 1] : null;
    this.faenaAjusteFecha = ultimaFaena?.fecha || new Date().toISOString().slice(0, 10);
    this.faenaAjusteCantidad = lote ? String(Number(lote.faenado) || 0) : '';
    this.faenaAjusteNota = '';
  }

  guardarFaena(): void {
    const lote = this.compraLoteSeleccionado();
    if (!lote) {
      this.error.set('Elegi un lote de la tabla.');
      return;
    }
    this.compraLoading.set(true);
    this.error.set('');
    this.comprasFaenaService.addFaena({
      lote_id: lote.id,
      fecha: this.faenaFecha,
      cantidad: this.faenaCantidad,
      nota: this.faenaNota,
    }).subscribe({
      next: () => {
        this.faenaModalOpen = false;
        this.cargarComprasFaena(lote.id);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo registrar la faena.');
        this.compraLoading.set(false);
      },
    });
  }

  guardarFaenaCorregida(): void {
    const lote = this.compraLoteSeleccionado();
    if (!lote) {
      this.error.set('Elegi un lote de la tabla.');
      return;
    }
    this.compraLoading.set(true);
    this.error.set('');
    this.comprasFaenaService.setFaenaTotal({
      lote_id: lote.id,
      fecha: this.faenaAjusteFecha,
      cantidad_total: this.faenaAjusteCantidad,
      nota: this.faenaAjusteNota,
    }).subscribe({
      next: () => {
        this.cargarComprasFaena(lote.id);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo corregir la faena del lote.');
        this.compraLoading.set(false);
      },
    });
  }

}
