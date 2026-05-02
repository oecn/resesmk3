import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcuerdoComercial, AcuerdoHistorial, AcuerdoUbicacion, ProveedorComercial } from './acuerdos-comerciales.models';
import { AcuerdosComercialesService } from './acuerdos-comerciales.service';

@Component({
  selector: 'app-acuerdos-comerciales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acuerdos-comerciales.component.html',
  styleUrl: './acuerdos-comerciales.component.css',
})
export class AcuerdosComercialesComponent implements OnInit {
  activeTab: 'nuevo' | 'cargados' | 'proveedores' | 'historial-proveedor' = 'cargados';
  acuerdos = signal<AcuerdoComercial[]>([]);
  acuerdoDetalle = signal<AcuerdoComercial | null>(null);
  historialProveedor = signal<AcuerdoComercial[]>([]);
  historialProveedorNombre = signal('');
  historialProveedorError = signal('');
  historial = signal<AcuerdoHistorial[]>([]);
  proveedores = signal<ProveedorComercial[]>([]);
  loading = signal(false);
  historialLoading = signal(false);
  historialError = signal('');
  error = signal('');
  ok = signal('');
  busqueda = '';
  proveedorBusqueda = '';
  proveedorEditId: number | null = null;
  proveedorBaseNombre = '';
  proveedorBaseRuc = '';
  proveedorBaseTelefono = '';
  proveedorBaseEmail = '';
  proveedorBaseActivo = true;
  editId: number | null = null;
  proveedorId: number | null = null;
  proveedorNombre = '';
  proveedorRuc = '';
  proveedorTelefono = '';
  proveedorEmail = '';
  titulo = '';
  retornoPorcentaje = '6';
  duracionMeses = '24';
  vigenciaDesde = new Date().toISOString().slice(0, 10);
  vigenciaHasta = '';
  estadoRenovacion = 'vigente';
  acuerdoOrigenId: number | null = null;
  observaciones = '';
  activo = true;
  ubicaciones: AcuerdoUbicacion[] = [
    { sucursal: 'luque', tipo_espacio: 'puntera', ubicacion: '', detalle: '', orden: 1 },
  ];
  readonly sucursales = [
    { slug: 'luque', nombre: 'Luque' },
    { slug: 'itaugua', nombre: 'Itaugua' },
    { slug: 'aregua', nombre: 'Aregua' },
  ];
  readonly tiposEspacio = [
    { value: 'puntera', label: 'Puntera' },
    { value: 'pestana', label: 'Pestaña' },
    { value: 'tramo_gondola', label: 'Tramo de góndola' },
    { value: 'isla', label: 'Isla' },
    { value: 'espacio_gondola_frio', label: 'Espacio en góndola frío' },
  ];
  readonly estadosRenovacion = [
    { value: 'vigente', label: 'Vigente' },
    { value: 'por_renovar', label: 'Por renovar' },
    { value: 'en_negociacion', label: 'En negociacion' },
    { value: 'renovado', label: 'Renovado' },
    { value: 'no_renovado', label: 'No renovado' },
    { value: 'vencido', label: 'Vencido' },
  ];
  totalUbicaciones = computed(() => this.acuerdos().reduce((acc, item) => acc + (Number(item.ubicaciones_count) || 0), 0));
  totalPunteras = computed(() => this.acuerdos().reduce((acc, item) => acc + (Number(item.punteras_count) || 0), 0));
  proveedoresCount = computed(() => this.proveedores().length);

  constructor(private readonly acuerdosService: AcuerdosComercialesService) {}

  ngOnInit(): void {
    this.actualizarVigenciaHasta();
    this.cargarAcuerdos();
    this.cargarProveedores();
  }

  cambiarTab(tab: 'nuevo' | 'cargados' | 'proveedores' | 'historial-proveedor'): void {
    this.activeTab = tab;
  }

  cargarAcuerdos(): void {
    this.loading.set(true);
    this.error.set('');
    this.acuerdosService.listAcuerdos(this.busqueda).subscribe({
      next: ({ items }) => {
        this.acuerdos.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudieron cargar los acuerdos comerciales.');
        this.loading.set(false);
      },
    });
  }

  cargarProveedores(): void {
    this.loading.set(true);
    this.error.set('');
    this.acuerdosService.listProveedores(this.proveedorBusqueda).subscribe({
      next: ({ items }) => {
        this.proveedores.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudieron cargar los proveedores.');
        this.loading.set(false);
      },
    });
  }

  guardarProveedorBase(): void {
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.saveProveedor({
      id: this.proveedorEditId,
      nombre: this.proveedorBaseNombre,
      ruc: this.proveedorBaseRuc,
      telefono: this.proveedorBaseTelefono,
      email: this.proveedorBaseEmail,
      activo: this.proveedorBaseActivo,
    }).subscribe({
      next: () => {
        this.ok.set(this.proveedorEditId ? 'Proveedor actualizado.' : 'Proveedor cargado.');
        this.limpiarProveedorBase();
        this.cargarProveedores();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar el proveedor.');
        this.loading.set(false);
      },
    });
  }

  editarProveedorBase(proveedor: ProveedorComercial): void {
    this.proveedorEditId = proveedor.id;
    this.proveedorBaseNombre = proveedor.nombre;
    this.proveedorBaseRuc = proveedor.ruc ?? '';
    this.proveedorBaseTelefono = proveedor.telefono ?? '';
    this.proveedorBaseEmail = proveedor.email ?? '';
    this.proveedorBaseActivo = proveedor.activo;
  }

  usarProveedorEnAcuerdo(proveedor: ProveedorComercial): void {
    this.activeTab = 'nuevo';
    this.proveedorId = proveedor.id;
    this.proveedorNombre = proveedor.nombre;
    this.proveedorRuc = proveedor.ruc ?? '';
    this.proveedorTelefono = proveedor.telefono ?? '';
    this.proveedorEmail = proveedor.email ?? '';
    if (!this.titulo) {
      this.titulo = `Acuerdo comercial ${proveedor.nombre}`;
    }
  }

  limpiarProveedorBase(): void {
    this.proveedorEditId = null;
    this.proveedorBaseNombre = '';
    this.proveedorBaseRuc = '';
    this.proveedorBaseTelefono = '';
    this.proveedorBaseEmail = '';
    this.proveedorBaseActivo = true;
  }

  guardarAcuerdo(): void {
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.saveAcuerdo({
      id: this.editId,
      proveedor: {
        id: this.proveedorId,
        nombre: this.proveedorNombre,
        ruc: this.proveedorRuc,
        telefono: this.proveedorTelefono,
        email: this.proveedorEmail,
      },
      titulo: this.titulo || `Acuerdo comercial ${this.proveedorNombre}`.trim(),
      retorno_porcentaje: this.retornoPorcentaje,
      duracion_meses: this.duracionMeses,
      vigencia_desde: this.vigenciaDesde || null,
      vigencia_hasta: this.vigenciaHasta || null,
      estado_renovacion: this.estadoRenovacion,
      acuerdo_origen_id: this.acuerdoOrigenId,
      observaciones: this.observaciones,
      activo: this.activo,
      ubicaciones: this.ubicaciones.map((item, index) => ({ ...item, orden: index + 1 })),
    }).subscribe({
      next: () => {
        this.ok.set(this.editId ? 'Acuerdo actualizado.' : 'Acuerdo cargado.');
        this.limpiarFormulario();
        this.cargarAcuerdos();
        this.cargarProveedores();
        this.activeTab = 'cargados';
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar el acuerdo comercial.');
        this.loading.set(false);
      },
    });
  }

  editarAcuerdo(acuerdo: AcuerdoComercial): void {
    this.activeTab = 'nuevo';
    this.acuerdoDetalle.set(null);
    this.editId = acuerdo.id;
    this.proveedorId = acuerdo.proveedor_id;
    this.proveedorNombre = acuerdo.proveedor_nombre;
    this.proveedorRuc = acuerdo.proveedor_ruc ?? '';
    this.proveedorTelefono = acuerdo.proveedor_telefono ?? '';
    this.proveedorEmail = acuerdo.proveedor_email ?? '';
    this.titulo = acuerdo.titulo;
    this.retornoPorcentaje = String(acuerdo.retorno_porcentaje ?? '');
    this.duracionMeses = String(acuerdo.duracion_meses ?? '');
    this.vigenciaDesde = acuerdo.vigencia_desde ?? '';
    this.vigenciaHasta = acuerdo.vigencia_hasta ?? '';
    this.estadoRenovacion = acuerdo.estado_renovacion ?? 'vigente';
    this.acuerdoOrigenId = acuerdo.acuerdo_origen_id ?? null;
    this.observaciones = acuerdo.observaciones ?? '';
    this.activo = acuerdo.activo;
    this.ubicaciones = acuerdo.ubicaciones.length
      ? acuerdo.ubicaciones.map((item) => ({ ...item }))
      : [{ sucursal: 'luque', tipo_espacio: 'puntera', ubicacion: '', detalle: '', orden: 1 }];
    this.cargarHistorial(acuerdo.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  verAcuerdo(acuerdo: AcuerdoComercial): void {
    this.acuerdoDetalle.set(acuerdo);
  }

  cerrarDetalleAcuerdo(): void {
    this.acuerdoDetalle.set(null);
  }

  verHistorialProveedorDesdeAcuerdo(acuerdo: AcuerdoComercial): void {
    this.cargarHistorialProveedor(acuerdo.proveedor_id, acuerdo.proveedor_nombre);
  }

  verHistorialProveedor(proveedor: ProveedorComercial): void {
    this.cargarHistorialProveedor(proveedor.id, proveedor.nombre);
  }

  cargarHistorialProveedor(proveedorId: number, proveedorNombre: string): void {
    this.loading.set(true);
    this.error.set('');
    this.historialProveedorError.set('');
    this.historialProveedorNombre.set(proveedorNombre);
    this.acuerdosService.listHistorialProveedor(proveedorId).subscribe({
      next: ({ items }) => {
        this.historialProveedor.set(items);
        this.activeTab = 'historial-proveedor';
        this.loading.set(false);
      },
      error: (err) => {
        if (err?.error?.error === 'Ruta no encontrada') {
          const fallback = this.acuerdos().filter((item) => Number(item.proveedor_id) === Number(proveedorId));
          this.historialProveedor.set(fallback);
          this.historialProveedorError.set('Historial completo no disponible hasta reiniciar el backend. Mostrando acuerdos cargados en pantalla.');
          this.activeTab = 'historial-proveedor';
        } else {
          this.error.set(err?.error?.error ?? 'No se pudo cargar el historial del proveedor.');
          this.historialProveedor.set([]);
        }
        this.loading.set(false);
      },
    });
  }

  renovarAcuerdo(acuerdo: AcuerdoComercial): void {
    if (!this.puedeRenovar(acuerdo)) {
      this.error.set('Este acuerdo ya fue renovado. Solo se puede renovar el ultimo acuerdo de la cadena.');
      return;
    }
    this.activeTab = 'nuevo';
    this.editId = null;
    this.acuerdoDetalle.set(null);
    this.proveedorId = acuerdo.proveedor_id;
    this.proveedorNombre = acuerdo.proveedor_nombre;
    this.proveedorRuc = acuerdo.proveedor_ruc ?? '';
    this.proveedorTelefono = acuerdo.proveedor_telefono ?? '';
    this.proveedorEmail = acuerdo.proveedor_email ?? '';
    this.titulo = `Renovacion ${acuerdo.titulo || acuerdo.proveedor_nombre}`.trim();
    this.retornoPorcentaje = String(acuerdo.retorno_porcentaje ?? '0');
    this.duracionMeses = String(acuerdo.duracion_meses ?? '24');
    this.vigenciaDesde = this.siguienteDia(acuerdo.vigencia_hasta) || new Date().toISOString().slice(0, 10);
    this.actualizarVigenciaHasta();
    this.estadoRenovacion = 'vigente';
    this.acuerdoOrigenId = acuerdo.id;
    this.observaciones = `Renovacion del acuerdo #${acuerdo.id}. ${acuerdo.observaciones ?? ''}`.trim();
    this.activo = true;
    this.ubicaciones = acuerdo.ubicaciones.length
      ? acuerdo.ubicaciones.map((item, index) => ({ ...item, id: undefined, acuerdo_id: undefined, orden: index + 1 }))
      : [{ sucursal: 'luque', tipo_espacio: 'puntera', ubicacion: '', detalle: '', orden: 1 }];
    this.historial.set([]);
    this.historialError.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  puedeRenovar(acuerdo: AcuerdoComercial): boolean {
    return !acuerdo.renovado_por_acuerdo_id && acuerdo.estado_renovacion !== 'renovado';
  }

  limpiarFormulario(): void {
    this.editId = null;
    this.proveedorId = null;
    this.proveedorNombre = '';
    this.proveedorRuc = '';
    this.proveedorTelefono = '';
    this.proveedorEmail = '';
    this.titulo = '';
    this.retornoPorcentaje = '6';
    this.duracionMeses = '24';
    this.vigenciaDesde = new Date().toISOString().slice(0, 10);
    this.actualizarVigenciaHasta();
    this.estadoRenovacion = 'vigente';
    this.acuerdoOrigenId = null;
    this.observaciones = '';
    this.activo = true;
    this.ubicaciones = [{ sucursal: 'luque', tipo_espacio: 'puntera', ubicacion: '', detalle: '', orden: 1 }];
    this.historial.set([]);
  }

  cargarHistorial(acuerdoId: number): void {
    this.historialLoading.set(true);
    this.historialError.set('');
    this.acuerdosService.listHistorial(acuerdoId).subscribe({
      next: ({ items }) => {
        this.historial.set(items);
        this.historialLoading.set(false);
      },
      error: (err) => {
        const message = err?.error?.error === 'Ruta no encontrada'
          ? 'Historial no disponible hasta reiniciar el backend.'
          : (err?.error?.error ?? 'No se pudo cargar el historial del acuerdo.');
        this.historialError.set(message);
        this.historial.set([]);
        this.historialLoading.set(false);
      },
    });
  }

  agregarUbicacion(): void {
    this.ubicaciones = [
      ...this.ubicaciones,
      { sucursal: 'luque', tipo_espacio: 'puntera', ubicacion: '', detalle: '', orden: this.ubicaciones.length + 1 },
    ];
  }

  quitarUbicacion(index: number): void {
    if (this.ubicaciones.length === 1) {
      this.ubicaciones = [{ sucursal: 'luque', tipo_espacio: 'puntera', ubicacion: '', detalle: '', orden: 1 }];
      return;
    }
    this.ubicaciones = this.ubicaciones.filter((_, itemIndex) => itemIndex !== index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  diasParaVencimiento(acuerdo: AcuerdoComercial): number | null {
    if (!acuerdo.vigencia_hasta) {
      return null;
    }
    const hasta = new Date(`${acuerdo.vigencia_hasta}T00:00:00`);
    if (Number.isNaN(hasta.getTime())) {
      return null;
    }
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return Math.ceil((hasta.getTime() - inicioHoy.getTime()) / 86400000);
  }

  vencimientoClass(acuerdo: AcuerdoComercial): string {
    const dias = this.diasParaVencimiento(acuerdo);
    if (dias === null) {
      return 'expiry-none';
    }
    if (dias < 0) {
      return 'expiry-expired';
    }
    if (dias <= 15) {
      return 'expiry-15';
    }
    if (dias <= 30) {
      return 'expiry-30';
    }
    if (dias <= 60) {
      return 'expiry-60';
    }
    return 'expiry-far';
  }

  vencimientoLabel(acuerdo: AcuerdoComercial): string {
    const dias = this.diasParaVencimiento(acuerdo);
    if (dias === null) {
      return 'Sin vencimiento';
    }
    if (dias < 0) {
      return `Vencido hace ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`;
    }
    if (dias === 0) {
      return 'Vence hoy';
    }
    return `Fin de acuerdo en: ${dias} dia${dias === 1 ? '' : 's'}`;
  }

  estadoRenovacionLabel(value?: string | null): string {
    return this.estadosRenovacion.find((item) => item.value === value)?.label ?? 'Vigente';
  }

  tipoEspacioLabel(value?: string | null): string {
    return this.tiposEspacio.find((item) => item.value === value)?.label ?? (value || '-');
  }

  actualizarVigenciaHasta(): void {
    const meses = Number(this.duracionMeses) || 0;
    if (!this.vigenciaDesde || meses <= 0) {
      this.vigenciaHasta = '';
      return;
    }
    const desde = new Date(`${this.vigenciaDesde}T00:00:00`);
    if (Number.isNaN(desde.getTime())) {
      this.vigenciaHasta = '';
      return;
    }
    const hasta = new Date(desde);
    hasta.setMonth(hasta.getMonth() + meses);
    hasta.setDate(hasta.getDate() - 1);
    this.vigenciaHasta = this.toIsoDate(hasta);
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private siguienteDia(value?: string | null): string {
    if (!value) {
      return '';
    }
    const fecha = new Date(`${value}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) {
      return '';
    }
    fecha.setDate(fecha.getDate() + 1);
    return this.toIsoDate(fecha);
  }

  formatHistorialValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Activo' : 'Inactivo';
    }
    if (Array.isArray(value)) {
      return `${value.length} ubicacion${value.length === 1 ? '' : 'es'}`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
