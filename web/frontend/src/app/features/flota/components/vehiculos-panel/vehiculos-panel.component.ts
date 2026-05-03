import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlotaCatalogosData, FlotaVehiculo } from '../../flota.models';
import { FlotaService } from '../../flota.service';

@Component({
  selector: 'app-vehiculos-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehiculos-panel.component.html',
  styleUrl: './vehiculos-panel.component.css',
})
export class VehiculosPanelComponent {
  @Input() catalogos: FlotaCatalogosData | null = null;
  @Input() vehiculos: FlotaVehiculo[] = [];
  @Input() sucursalBloqueada: string | null = null;
  @Input() canManageProviders = false;
  @Input() parentLoading = false;
  @Output() saved = new EventEmitter<void>();

  vehiculoCodigo = '';
  vehiculoChapa = '';
  vehiculoNombre = '';
  vehiculoEditId: number | null = null;
  vehiculoMarca = '';
  vehiculoModelo = '';
  vehiculoAnho = '';
  vehiculoTipo = '';
  vehiculoSucursal = 'luque';
  vehiculoChofer = '';
  vehiculoActivo = true;

  proveedorNombre = '';
  proveedorTipo: 'combustible' | 'taller' | 'otros' = 'combustible';
  proveedorRuc = '';
  proveedorTelefono = '';
  proveedorActivo = true;

  loading = signal(false);
  error = signal('');
  ok = signal('');

  readonly tiposVehiculo = [
    'camion carga pesada',
    'utilitario',
    'Ejecutivo con apoyo operativo',
    'generadores',
  ];

  constructor(private readonly flotaService: FlotaService) {}

  get busy(): boolean {
    return this.parentLoading || this.loading();
  }

  editarVehiculoFlota(vehiculo: FlotaVehiculo): void {
    this.vehiculoEditId = vehiculo.id;
    this.vehiculoCodigo = vehiculo.codigo ?? '';
    this.vehiculoChapa = vehiculo.chapa ?? '';
    this.vehiculoNombre = vehiculo.nombre ?? '';
    this.vehiculoMarca = vehiculo.marca ?? '';
    this.vehiculoModelo = vehiculo.modelo ?? '';
    this.vehiculoAnho = vehiculo.anho ? String(vehiculo.anho) : '';
    this.vehiculoTipo = vehiculo.tipo ?? '';
    this.vehiculoSucursal = this.sucursalBloqueada ?? vehiculo.sucursal ?? 'luque';
    this.vehiculoChofer = vehiculo.chofer ?? '';
    this.vehiculoActivo = vehiculo.activo;
  }

  cancelarEdicionVehiculo(): void {
    this.resetVehiculoForm();
  }

  crearVehiculoFlota(): void {
    const editing = this.vehiculoEditId !== null;
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.flotaService.saveFlotaVehiculo({
      id: this.vehiculoEditId,
      codigo: this.vehiculoCodigo,
      chapa: this.vehiculoChapa,
      nombre: this.vehiculoNombre,
      marca: this.vehiculoMarca,
      modelo: this.vehiculoModelo,
      anho: this.vehiculoAnho || null,
      tipo: this.vehiculoTipo,
      sucursal: this.vehiculoSucursal || null,
      chofer: this.vehiculoChofer,
      activo: this.vehiculoActivo,
    }).subscribe({
      next: () => {
        this.resetVehiculoForm();
        this.ok.set(editing ? 'Vehiculo actualizado.' : 'Vehiculo cargado.');
        this.loading.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar el vehiculo.');
        this.loading.set(false);
      },
    });
  }

  crearProveedorFlota(): void {
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.flotaService.saveFlotaProveedor({
      nombre: this.proveedorNombre,
      tipo: this.proveedorTipo,
      ruc: this.proveedorRuc,
      telefono: this.proveedorTelefono,
      activo: this.proveedorActivo,
    }).subscribe({
      next: () => {
        this.proveedorNombre = '';
        this.proveedorTipo = 'combustible';
        this.proveedorRuc = '';
        this.proveedorTelefono = '';
        this.proveedorActivo = true;
        this.ok.set('Proveedor cargado.');
        this.loading.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar el proveedor.');
        this.loading.set(false);
      },
    });
  }

  vehiculosFlotaPorSucursal(sucursal?: string | null): FlotaVehiculo[] {
    const slug = String(sucursal ?? '').trim().toLowerCase();
    return this.vehiculos.filter((vehiculo) => String(vehiculo.sucursal ?? '').trim().toLowerCase() === slug);
  }

  vehiculosFlotaSinSucursal(): FlotaVehiculo[] {
    return this.vehiculos.filter((vehiculo) => !String(vehiculo.sucursal ?? '').trim());
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
    if (nombre && nombre !== principal) {
      return `${principal} - ${nombre}`;
    }
    return principal;
  }

  private resetVehiculoForm(): void {
    this.vehiculoEditId = null;
    this.vehiculoCodigo = '';
    this.vehiculoChapa = '';
    this.vehiculoNombre = '';
    this.vehiculoMarca = '';
    this.vehiculoModelo = '';
    this.vehiculoAnho = '';
    this.vehiculoTipo = '';
    this.vehiculoSucursal = this.sucursalBloqueada ?? 'luque';
    this.vehiculoChofer = '';
    this.vehiculoActivo = true;
  }
}
