import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlotaCombustibleImportPreviewResult, FlotaCombustibleImportPreviewRow, FlotaCombustibleRow, FlotaProveedor, FlotaVehiculo } from '../../flota.models';
import { FlotaService } from '../../flota.service';
import { FmtMoneyPipe } from '../../../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../../../shared/pipes/fmt-number.pipe';

@Component({
  selector: 'app-combustible-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtMoneyPipe, FmtNumberPipe],
  templateUrl: './combustible-panel.component.html',
  styleUrl: './combustible-panel.component.css',
})
export class CombustiblePanelComponent implements OnInit, OnChanges {
  @Input() vehiculos: FlotaVehiculo[] = [];
  @Input() proveedores: FlotaProveedor[] = [];
  @Input() sucursal: string | null = null;
  @Input() canImport = false;
  @Output() saved = new EventEmitter<void>();

  flotaVehiculoId: number | null = null;
  combustibleFecha = new Date().toISOString().slice(0, 10);
  combustibleDesde = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  combustibleHasta = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
  combustibleVehiculoId: number | null = null;
  combustibleProveedorId: number | null = null;
  combustibleImportProveedorId: number | null = null;
  combustibleImportFile: File | null = null;
  combustibleImportFileName = '';
  combustibleEditId: number | null = null;
  combustibleTipo = 'OPTIMO DIESEL';
  combustibleLitros = '';
  combustibleImporte = '';
  combustibleFactura = '';
  combustibleObservacion = '';

  loading = signal(false);
  error = signal('');
  ok = signal('');
  flotaCombustible = signal<FlotaCombustibleRow[]>([]);
  flotaCombustibleImportPreview = signal<FlotaCombustibleImportPreviewRow[]>([]);
  flotaCombustibleImportPreviewSummary = signal<FlotaCombustibleImportPreviewResult | null>(null);
  combustibleSelectedId: number | null = null;
  readonly tiposCombustible = ['SUPREMA 97', 'OPTIMO DIESEL', 'DIESEL MAX S10'];

  flotaCombustibleResumen = computed(() => {
    const items = this.flotaCombustible();
    const totalLitros = items.reduce((acc, item) => acc + (Number(item.litros) || 0), 0);
    const totalImporte = items.reduce((acc, item) => acc + (Number(item.importe) || 0), 0);
    const promedioLitro = totalLitros > 0 ? totalImporte / totalLitros : 0;
    return {
      cargas: items.length,
      litros: totalLitros,
      importe: totalImporte,
      promedioLitro,
      ultimaFecha: items[0]?.fecha ?? '',
    };
  });

  constructor(private readonly flotaService: FlotaService) {}

  ngOnInit(): void {
    this.ensureDefaults();
    this.cargarFlotaCombustible(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ensureDefaults();
    if (changes['sucursal'] && !changes['sucursal'].firstChange) {
      this.cargarFlotaCombustible();
    }
  }

  cargarFlotaCombustible(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    this.error.set('');
    this.flotaService.getFlotaCombustible({
      desde: this.combustibleDesde || undefined,
      hasta: this.combustibleHasta || undefined,
      vehiculo_id: this.flotaVehiculoId,
      sucursal: this.sucursal || null,
    }).subscribe({
      next: ({ items }) => {
        this.flotaCombustible.set(items);
        if (this.combustibleSelectedId && !items.find((item) => item.id === this.combustibleSelectedId)) {
          this.combustibleSelectedId = items[0]?.id ?? null;
        }
        if (showLoading) {
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar combustible.');
        if (showLoading) {
          this.loading.set(false);
        }
      },
    });
  }

  limpiarFiltrosCombustible(): void {
    this.combustibleDesde = '';
    this.combustibleHasta = '';
    this.flotaVehiculoId = null;
    this.cargarFlotaCombustible();
  }

  combustiblePrecioLitro(): number {
    const litros = Number(this.combustibleLitros) || 0;
    const importe = Number(this.combustibleImporte) || 0;
    if (!litros || !importe) {
      return 0;
    }
    return importe / litros;
  }

  crearCargaCombustible(): void {
    if (!this.combustibleVehiculoId) {
      this.error.set('Selecciona un vehiculo para la carga.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.flotaService.saveFlotaCombustible({
      id: this.combustibleEditId,
      fecha: this.combustibleFecha,
      vehiculo_id: this.combustibleVehiculoId,
      proveedor_id: this.combustibleProveedorId,
      tipo_combustible: this.combustibleTipo,
      litros: this.combustibleLitros,
      importe: this.combustibleImporte,
      nro_factura: this.combustibleFactura,
      observacion: this.combustibleObservacion,
    }).subscribe({
      next: () => {
        const editing = Boolean(this.combustibleEditId);
        this.limpiarFormularioCombustible();
        this.ok.set(editing ? 'Carga de combustible actualizada.' : 'Carga de combustible registrada.');
        this.loading.set(false);
        this.cargarFlotaCombustible(false);
        this.saved.emit();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo registrar la carga.');
        this.loading.set(false);
      },
    });
  }

  editarCargaCombustible(row: FlotaCombustibleRow): void {
    this.seleccionarCargaCombustible(row);
    this.combustibleEditId = row.id;
    this.combustibleFecha = row.fecha;
    this.combustibleVehiculoId = row.vehiculo_id;
    this.combustibleProveedorId = row.proveedor_id ?? null;
    this.combustibleTipo = row.tipo_combustible || 'OPTIMO DIESEL';
    this.combustibleLitros = String(row.litros ?? '');
    this.combustibleImporte = String(row.importe ?? '');
    this.combustibleFactura = row.nro_factura ?? '';
    this.combustibleObservacion = row.observacion ?? '';
    this.ok.set(`Editando carga #${row.id}.`);
    this.error.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicionCombustible(): void {
    this.limpiarFormularioCombustible();
    this.ok.set('');
    this.error.set('');
  }

  seleccionarCargaCombustible(row: FlotaCombustibleRow): void {
    this.combustibleSelectedId = row.id;
  }

  moverSeleccionCombustible(offset: number): void {
    const rows = this.flotaCombustible();
    if (!rows.length) {
      return;
    }
    const currentIndex = this.combustibleSelectedId
      ? rows.findIndex((item) => item.id === this.combustibleSelectedId)
      : -1;
    const nextIndex = Math.min(Math.max(currentIndex + offset, 0), rows.length - 1);
    this.combustibleSelectedId = rows[nextIndex].id;
  }

  onCombustibleHistoryKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moverSeleccionCombustible(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moverSeleccionCombustible(-1);
    }
  }

  eliminarCargaCombustible(row: FlotaCombustibleRow): void {
    const vehiculo = this.vehiculoMovLabel(row);
    const motivo = window.prompt(`Motivo de eliminacion para la carga de ${vehiculo} del ${row.fecha}:`, '');
    if (motivo === null) {
      return;
    }
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      this.error.set('Debes indicar el motivo de eliminacion.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.flotaService.deleteFlotaCombustible({ id: row.id, motivo: motivoLimpio }).subscribe({
      next: () => {
        this.ok.set('Carga de combustible eliminada.');
        this.loading.set(false);
        this.cargarFlotaCombustible(false);
        this.saved.emit();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo eliminar la carga.');
        this.loading.set(false);
      },
    });
  }

  onCombustibleImportSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.combustibleImportFile = file;
    this.combustibleImportFileName = file?.name ?? '';
    this.flotaCombustibleImportPreview.set([]);
    this.flotaCombustibleImportPreviewSummary.set(null);
  }

  importarCombustibleArchivo(): void {
    if (!this.combustibleImportFile) {
      this.error.set('Selecciona un archivo CSV o XLSX.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.readFileAsDataUrl(this.combustibleImportFile)
      .then((fileContent) => {
        this.flotaService.importFlotaCombustible({
          file_name: this.combustibleImportFile?.name ?? 'combustible.xlsx',
          file_content: fileContent,
          proveedor_id: this.combustibleImportProveedorId,
        }).subscribe({
          next: (result) => {
            this.combustibleImportFile = null;
            this.combustibleImportFileName = '';
            this.ok.set(
              `Importacion completada. ${result.inserted} filas cargadas, ${result.skipped} omitidas.${result.errors.length ? ` ${result.errors.length} con error.` : ''}`,
            );
            if (result.errors.length) {
              const topErrors = result.errors.slice(0, 5).map((item) => `Fila ${item.row}: ${item.error}`).join(' | ');
              this.error.set(topErrors);
            }
            this.loading.set(false);
            this.cargarFlotaCombustible(false);
            this.saved.emit();
          },
          error: (err) => {
            this.error.set(err?.error?.error ?? 'No se pudo importar el archivo.');
            this.loading.set(false);
          },
        });
      })
      .catch((err) => {
        this.error.set(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
        this.loading.set(false);
      });
  }

  previsualizarCombustibleArchivo(): void {
    if (!this.combustibleImportFile) {
      this.error.set('Selecciona un archivo CSV o XLSX.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.readFileAsDataUrl(this.combustibleImportFile)
      .then((fileContent) => {
        this.flotaService.previewFlotaCombustibleImport({
          file_name: this.combustibleImportFile?.name ?? 'combustible.xlsx',
          file_content: fileContent,
          proveedor_id: this.combustibleImportProveedorId,
        }).subscribe({
          next: (result) => {
            this.flotaCombustibleImportPreview.set(result.items);
            this.flotaCombustibleImportPreviewSummary.set(result);
            this.ok.set(`Vista previa lista. ${result.ok_count} filas validas, ${result.error_count} con error, ${result.skipped} omitidas.`);
            if (result.error_count) {
              const topErrors = result.items
                .filter((item) => item.status === 'error')
                .slice(0, 5)
                .map((item) => `Fila ${item.row}: ${item.error}`)
                .join(' | ');
              this.error.set(topErrors);
            }
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(err?.error?.error ?? 'No se pudo generar la vista previa.');
            this.loading.set(false);
          },
        });
      })
      .catch((err) => {
        this.error.set(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
        this.loading.set(false);
      });
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

  vehiculoMovLabel(row: { vehiculo_id?: number | null; vehiculo_codigo?: string | null; chapa?: string | null; vehiculo_nombre?: string | null }): string {
    return this.vehiculoDisplayLabel({
      id: row.vehiculo_id,
      codigo: row.vehiculo_codigo,
      chapa: row.chapa,
      nombre: row.vehiculo_nombre,
    });
  }

  private ensureDefaults(): void {
    if (!this.vehiculos.find((item) => item.id === this.combustibleVehiculoId)) {
      this.combustibleVehiculoId = this.vehiculos.find((item) => item.activo)?.id ?? this.vehiculos[0]?.id ?? null;
    }
    if (this.flotaVehiculoId && !this.vehiculos.find((item) => item.id === this.flotaVehiculoId)) {
      this.flotaVehiculoId = null;
    }
    if (!this.combustibleProveedorId) {
      this.combustibleProveedorId = this.proveedores[0]?.id ?? null;
    }
  }

  private limpiarFormularioCombustible(): void {
    this.combustibleEditId = null;
    this.combustibleTipo = 'OPTIMO DIESEL';
    this.combustibleLitros = '';
    this.combustibleImporte = '';
    this.combustibleFactura = '';
    this.combustibleObservacion = '';
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }
}
