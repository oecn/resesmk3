import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { FlotaGastoRow, FlotaProveedor, FlotaTipoGasto, FlotaVehiculo } from '../../flota.models';
import { FlotaService } from '../../flota.service';
import { FmtMoneyPipe } from '../../../../shared/pipes/fmt-money.pipe';
import { FmtNumberPipe } from '../../../../shared/pipes/fmt-number.pipe';

@Component({
  selector: 'app-gastos-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtMoneyPipe, FmtNumberPipe],
  templateUrl: './gastos-panel.component.html',
  styleUrl: './gastos-panel.component.css',
})
export class GastosPanelComponent implements OnInit, OnChanges {
  private readonly authService = inject(AuthService);
  private readonly flotaService = inject(FlotaService);

  @Input() vehiculos: FlotaVehiculo[] = [];
  @Input() proveedores: FlotaProveedor[] = [];
  @Input() tiposGasto: FlotaTipoGasto[] = [];
  @Input() sucursal: string | null = null;
  @Output() saved = new EventEmitter<void>();

  gastoFecha = new Date().toISOString().slice(0, 10);
  gastoEditId: number | null = null;
  gastoVehiculoId: number | null = null;
  gastoTipoId: number | null = null;
  gastoProveedorId: number | null = null;
  gastoProveedorNombre = '';
  gastoProveedorRuc = '';
  gastoImporte = '';
  gastoKmActual = '';
  gastoFactura = '';
  gastoDetalle = '';

  loading = signal(false);
  error = signal('');
  ok = signal('');
  flotaGastos = signal<FlotaGastoRow[]>([]);
  currentUser = this.authService.currentUser;

  ngOnInit(): void {
    this.ensureDefaults();
    this.cargarFlotaGastos(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ensureDefaults();
    if (changes['sucursal'] && !changes['sucursal'].firstChange) {
      this.cargarFlotaGastos();
    }
  }

  cargarFlotaGastos(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    this.error.set('');
    this.flotaService.getFlotaGastos({
      sucursal: this.sucursal || null,
    }).subscribe({
      next: ({ items }) => {
        this.flotaGastos.set(items);
        if (showLoading) {
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar gastos de flota.');
        if (showLoading) {
          this.loading.set(false);
        }
      },
    });
  }

  crearGastoFlota(): void {
    if (!this.gastoVehiculoId || !this.gastoTipoId) {
      this.error.set('Completa vehiculo y tipo de gasto.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.flotaService.saveFlotaGasto({
      id: this.gastoEditId,
      fecha: this.gastoFecha,
      vehiculo_id: this.gastoVehiculoId,
      tipo_gasto_id: this.gastoTipoId,
      proveedor_id: this.gastoProveedorId,
      proveedor_nombre: this.gastoProveedorNombre,
      proveedor_ruc: this.gastoProveedorRuc,
      importe: this.gastoImporte,
      km_actual: this.gastoKmActual || null,
      nro_factura: this.gastoFactura,
      detalle: this.gastoDetalle,
    }).subscribe({
      next: () => {
        const editing = this.gastoEditId !== null;
        this.resetGastoForm();
        this.ok.set(editing ? 'Gasto actualizado.' : 'Gasto registrado.');
        this.loading.set(false);
        this.cargarFlotaGastos(false);
        this.saved.emit();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo registrar el gasto.');
        this.loading.set(false);
      },
    });
  }

  editarGastoFlota(row: FlotaGastoRow): void {
    if (!this.canModifyGastoFlota(row)) {
      this.error.set('Recepcion solo puede editar gastos creados en los ultimos 2 dias.');
      return;
    }
    this.gastoEditId = row.id;
    this.gastoFecha = row.fecha;
    this.gastoVehiculoId = row.vehiculo_id;
    this.gastoTipoId = row.tipo_gasto_id;
    this.gastoProveedorId = row.proveedor_id ?? null;
    this.gastoProveedorNombre = row.proveedor_nombre ?? '';
    this.gastoProveedorRuc = row.proveedor_ruc ?? '';
    this.gastoImporte = String(row.importe ?? '');
    this.gastoKmActual = row.km_actual != null ? String(row.km_actual) : '';
    this.gastoFactura = row.nro_factura ?? '';
    this.gastoDetalle = row.detalle ?? '';
  }

  cancelarEdicionGasto(): void {
    this.resetGastoForm();
  }

  eliminarGastoFlota(row: FlotaGastoRow): void {
    if (!this.canModifyGastoFlota(row)) {
      this.error.set('Recepcion solo puede eliminar gastos creados en los ultimos 2 dias.');
      return;
    }
    const vehiculo = this.vehiculoMovLabel(row);
    const motivo = window.prompt(`Motivo de eliminacion para el gasto de ${vehiculo} del ${row.fecha}:`, '');
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
    this.flotaService.deleteFlotaGasto({ id: row.id, motivo: motivoLimpio }).subscribe({
      next: () => {
        this.ok.set('Gasto de flota eliminado.');
        this.loading.set(false);
        this.cargarFlotaGastos(false);
        this.saved.emit();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo eliminar el gasto.');
        this.loading.set(false);
      },
    });
  }

  canModifyGastoFlota(row: FlotaGastoRow): boolean {
    const role = this.currentUser()?.rol;
    if (role === 'admin' || role === 'supervisor') {
      return true;
    }
    if (role !== 'recepcion' || !row.creado_en) {
      return false;
    }
    const createdAt = new Date(row.creado_en).getTime();
    if (!Number.isFinite(createdAt)) {
      return false;
    }
    return Date.now() - createdAt <= 2 * 24 * 60 * 60 * 1000;
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

  private resetGastoForm(): void {
    this.gastoEditId = null;
    this.gastoProveedorNombre = '';
    this.gastoProveedorRuc = '';
    this.gastoImporte = '';
    this.gastoKmActual = '';
    this.gastoFactura = '';
    this.gastoDetalle = '';
  }

  private ensureDefaults(): void {
    if (!this.vehiculos.find((item) => item.id === this.gastoVehiculoId)) {
      this.gastoVehiculoId = this.vehiculos.find((item) => item.activo)?.id ?? this.vehiculos[0]?.id ?? null;
    }
    if (!this.gastoTipoId) {
      this.gastoTipoId = this.tiposGasto[0]?.id ?? null;
    }
    if (!this.gastoProveedorId) {
      this.gastoProveedorId = this.proveedores[0]?.id ?? null;
    }
  }
}
