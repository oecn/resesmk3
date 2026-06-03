import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import {
  AcuerdoComercial,
  AcuerdoCobranza,
  AcuerdoHistorial,
  AcuerdoUbicacion,
  AcuerdosEstadisticasResponse,
  MapaUbicacion,
  ProveedorComercial,
} from './acuerdos-comerciales.models';
import { AcuerdosComercialesService } from './acuerdos-comerciales.service';
import { CobranzasPanelComponent } from './components/cobranzas-panel/cobranzas-panel.component';

@Component({
  selector: 'app-acuerdos-comerciales',
  standalone: true,
  imports: [CommonModule, FormsModule, CobranzasPanelComponent],
  templateUrl: './acuerdos-comerciales.component.html',
  styleUrl: './acuerdos-comerciales.component.css',
})
export class AcuerdosComercialesComponent implements OnInit {
  private acuerdosSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private proveedoresSearchTimer: ReturnType<typeof setTimeout> | null = null;
  activeTab: 'nuevo' | 'negociaciones' | 'cargados' | 'proveedores' | 'cobranzas' | 'estadisticas' | 'historial-proveedor' | 'importar-ubicaciones' | 'mapa' = 'cargados';
  acuerdos = signal<AcuerdoComercial[]>([]);
  cobranzasEjecutivas = signal<AcuerdoCobranza[]>([]);
  estadisticas = signal<AcuerdosEstadisticasResponse | null>(null);
  acuerdoDetalle = signal<AcuerdoComercial | null>(null);
  historialProveedor = signal<AcuerdoComercial[]>([]);
  mapaUbicaciones = signal<MapaUbicacion[]>([]);
  historialProveedorNombre = signal('');
  historialProveedorError = signal('');
  historial = signal<AcuerdoHistorial[]>([]);
  proveedores = signal<ProveedorComercial[]>([]);
  loading = signal(false);
  estadisticasLoading = signal(false);
  historialLoading = signal(false);
  historialError = signal('');
  error = signal('');
  ok = signal('');
  estadisticasError = signal('');
  busqueda = '';
  estadisticasMes = new Date().getMonth() + 1;
  estadisticasAnho = new Date().getFullYear();
  proveedorBusqueda = '';
  proveedorEditId: number | null = null;
  proveedorBaseNombre = '';
  proveedorBaseRuc = '';
  proveedorBaseTelefono = '';
  proveedorBaseEmail = '';
  proveedorBaseActivo = true;
  mapaSucursal: 'aregua' | 'luque' | 'itaugua' = 'aregua';
  mapaFiltroEstado: 'todos' | 'libres' | 'ocupados' = 'todos';
  mapaFiltroProveedorId: number | null = null;
  mapaFiltroBloque = '';
  mapaFiltroTipo: '' | 'puntera' | 'pestana' = '';
  mapaUbicacionDetalle = signal<any | null>(null);
  selectorUbicacionIndex = signal<number | null>(null);
  proveedorAsignacionId: number | null = null;
  mapaAsignacionValor = '';
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
  importUbicacionesTexto = '';
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
  readonly mapaBloques = [
    { key: 'A', label: 'Bloque A', className: 'block-a' },
    { key: 'B', label: 'Bloque B', className: 'block-b' },
    { key: 'C', label: 'Bloque C', className: 'block-c' },
    { key: 'D', label: 'Bloque D', className: 'block-d' },
  ];
  readonly mapaPerfumeriaBloques = [
    { key: 'PA', label: 'Perfumeria PA', className: 'block-perfume', numeros: [1, 2, 3, 4] },
    { key: 'PB', label: 'Perfumeria PB', className: 'block-perfume', numeros: [4, 3, 2, 1] },
  ];
  readonly mapaLineaCajaBloques = [
    { key: 'LC', label: 'Linea de caja', className: 'block-cashier', numeros: Array.from({ length: 24 }, (_, index) => index + 1) },
  ];
  readonly mapaPanaderiaBloques = [
    { key: 'PAN', label: 'Panaderia', className: 'block-bakery', numeros: [1, 2, 3] },
  ];
  totalUbicaciones = computed(() => this.acuerdos().reduce((acc, item) => acc + (Number(item.ubicaciones_count) || 0), 0));
  totalPunteras = computed(() => this.ubicacionesRegistradasPorTipo('puntera').size);
  totalPestanas = computed(() => this.ubicacionesRegistradasPorTipo('pestana').size);
  ubicacionesSinValor = computed(() => this.acuerdos().reduce(
    (acc, item) => acc + item.ubicaciones.filter((ubicacion) => this.esUbicacionSinValor(ubicacion)).length,
    0,
  ));
  punterasRegistradas = computed(() => this.ubicacionesRegistradasPorTipo('puntera').size);
  punterasOcupadas = computed(() => this.ubicacionesOcupadasPorTipo('puntera').size);
  lateralesRegistrados = computed(() => this.ubicacionesRegistradasPorTipo('pestana').size);
  lateralesOcupados = computed(() => this.ubicacionesOcupadasPorTipo('pestana').size);
  ocupacionKpis = computed(() => [
    ...this.ocupacionKpisPorTipo('puntera', 'Punteras'),
    ...this.ocupacionKpisPorTipo('pestana', 'Laterales'),
  ]);
  ocupacionTotal = computed(() => this.ocupacionKpis().reduce(
    (acc, item) => ({
      ocupadas: acc.ocupadas + item.ocupadas,
      total: acc.total + item.total,
    }),
    { ocupadas: 0, total: 0 },
  ));
  proveedoresCount = computed(() => this.proveedores().length);
  negociaciones = computed(() => this.acuerdos().filter((item) => item.estado_renovacion === 'en_negociacion'));

  currentUser = this.authService.currentUser;
  canViewEstadisticas = computed(() => this.permissions.canAccessModule(this.currentUser(), 'acuerdos-estadisticas'));
  canEditValoresUbicaciones = computed(() => this.permissions.canAccessModule(this.currentUser(), 'acuerdos-valores'));

  constructor(
    private readonly acuerdosService: AcuerdosComercialesService,
    private readonly authService: AuthService,
    private readonly permissions: PermissionsService,
  ) {}

  ngOnInit(): void {
    this.actualizarVigenciaHasta();
    this.cargarAcuerdos();
    this.cargarProveedores();
    this.cargarMapaUbicaciones();
    this.cargarCobranzasEjecutivas();
    if (this.canViewEstadisticas()) {
      this.cargarEstadisticas();
    }
  }

  cambiarTab(tab: 'nuevo' | 'negociaciones' | 'cargados' | 'proveedores' | 'cobranzas' | 'estadisticas' | 'historial-proveedor' | 'importar-ubicaciones' | 'mapa'): void {
    this.activeTab = tab;
    if (tab === 'estadisticas' && !this.canViewEstadisticas()) {
      this.error.set('No tienes permisos para ver estadisticas de acuerdos.');
      this.activeTab = 'cargados';
      return;
    }
    if (tab === 'estadisticas' && !this.estadisticas()) {
      this.cargarEstadisticas();
    }
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

  buscarAcuerdosAutomatico(): void {
    if (this.acuerdosSearchTimer) {
      clearTimeout(this.acuerdosSearchTimer);
    }
    this.acuerdosSearchTimer = setTimeout(() => this.cargarAcuerdos(), 300);
  }

  buscarProveedoresAutomatico(): void {
    if (this.proveedoresSearchTimer) {
      clearTimeout(this.proveedoresSearchTimer);
    }
    this.proveedoresSearchTimer = setTimeout(() => this.cargarProveedores(), 300);
  }

  cargarMapaUbicaciones(): void {
    this.acuerdosService.listMapaUbicaciones(this.mapaSucursal).subscribe({
      next: ({ items }) => this.mapaUbicaciones.set(items),
      error: (err) => this.error.set(err?.error?.error ?? 'No se pudo cargar el mapa de ubicaciones.'),
    });
  }

  cargarCobranzasEjecutivas(): void {
    const hoy = new Date();
    this.acuerdosService.listCobranzas(hoy.getMonth() + 1, hoy.getFullYear()).subscribe({
      next: ({ items }) => this.cobranzasEjecutivas.set(items),
      error: () => this.cobranzasEjecutivas.set([]),
    });
  }

  cargarEstadisticas(): void {
    if (!this.canViewEstadisticas()) {
      return;
    }
    this.estadisticasLoading.set(true);
    this.estadisticasError.set('');
    this.acuerdosService.getEstadisticas(this.estadisticasMes, this.estadisticasAnho).subscribe({
      next: (data) => {
        this.estadisticas.set(data);
        this.estadisticasLoading.set(false);
      },
      error: (err) => {
        this.estadisticasError.set(err?.error?.error ?? 'No se pudieron cargar las estadisticas.');
        this.estadisticasLoading.set(false);
      },
    });
  }

  actualizarEstadisticasDesdeFecha(value: string): void {
    if (!value) {
      return;
    }
    const fecha = new Date(`${value}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) {
      return;
    }
    this.estadisticasMes = fecha.getMonth() + 1;
    this.estadisticasAnho = fecha.getFullYear();
    this.cargarEstadisticas();
  }

  estadisticasPeriodoInputValue(): string {
    return `${this.estadisticasAnho}-${String(this.estadisticasMes).padStart(2, '0')}-01`;
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

  guardarAcuerdo(estadoOverride?: string | null): void {
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    const estadoOriginal = this.estadoRenovacion;
    if (estadoOverride) {
      this.estadoRenovacion = estadoOverride;
    } else if (this.activeTab === 'negociaciones') {
      this.estadoRenovacion = 'en_negociacion';
    }
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
        const estadoGuardado = this.estadoRenovacion;
        const estadoMensaje = estadoGuardado === 'en_negociacion'
          ? ' guardado en negociacion.'
          : estadoGuardado === 'vigente'
            ? ' confirmado.'
            : ' guardado.';
        this.ok.set(`Acuerdo${estadoMensaje}`);
        this.limpiarFormulario();
        this.cargarAcuerdos();
        this.cargarProveedores();
        this.cargarMapaUbicaciones();
        this.cargarCobranzasEjecutivas();
        this.cargarEstadisticas();
        this.activeTab = estadoGuardado === 'en_negociacion' ? 'negociaciones' : 'cargados';
      },
      error: (err) => {
        this.estadoRenovacion = estadoOriginal;
        this.error.set(err?.error?.error ?? 'No se pudo guardar el acuerdo comercial.');
        this.loading.set(false);
      },
    });
  }

  descartarNegociacion(acuerdo: AcuerdoComercial): void {
    if (acuerdo.estado_renovacion !== 'en_negociacion') {
      this.error.set('Solo se pueden descartar negociaciones abiertas.');
      return;
    }
    const confirmado = window.confirm(
      `Descartar la negociacion "${acuerdo.titulo}"? El acuerdo vigente original no se modifica.`
    );
    if (!confirmado) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.descartarNegociacion(acuerdo.id).subscribe({
      next: () => {
        if (this.editId === acuerdo.id) {
          this.limpiarFormulario();
        }
        this.ok.set('Negociacion descartada. El acuerdo vigente queda sin cambios.');
        this.cargarAcuerdos();
        this.cargarMapaUbicaciones();
        this.cargarCobranzasEjecutivas();
        this.cargarEstadisticas();
        this.activeTab = 'negociaciones';
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo descartar la negociacion.');
        this.loading.set(false);
      },
    });
  }

  descartarNegociacionActual(): void {
    const acuerdo = this.acuerdos().find((item) => Number(item.id) === Number(this.editId));
    if (!acuerdo) {
      this.error.set('No se encontro la negociacion abierta.');
      return;
    }
    this.descartarNegociacion(acuerdo);
  }

  eliminarAcuerdo(acuerdo: AcuerdoComercial): void {
    const password = window.prompt(`Contrasena para eliminar el acuerdo "${acuerdo.titulo}"`);
    if (password === null) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.eliminarAcuerdo(acuerdo.id, password).subscribe({
      next: () => {
        if (this.editId === acuerdo.id) {
          this.limpiarFormulario();
        }
        if (this.acuerdoDetalle()?.id === acuerdo.id) {
          this.acuerdoDetalle.set(null);
        }
        this.ok.set('Acuerdo eliminado.');
        this.cargarAcuerdos();
        this.cargarProveedores();
        this.cargarMapaUbicaciones();
        this.cargarCobranzasEjecutivas();
        this.cargarEstadisticas();
        this.activeTab = 'cargados';
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo eliminar el acuerdo.');
        this.loading.set(false);
      },
    });
  }

  editarAcuerdo(acuerdo: AcuerdoComercial): void {
    this.activeTab = acuerdo.estado_renovacion === 'en_negociacion' ? 'negociaciones' : 'nuevo';
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
    this.activeTab = 'cargados';
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
    this.activeTab = 'negociaciones';
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
    this.estadoRenovacion = 'en_negociacion';
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

  importarUbicacionesAregua(): void {
    if (!this.importUbicacionesTexto.trim()) {
      this.error.set('Pega la tabla de ubicaciones de Aregua.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.importUbicacionesAregua(this.importUbicacionesTexto).subscribe({
      next: (result) => {
        this.ok.set(
          `Importacion Aregua: ${result.leidas} leidas, ${result.creadas} creadas, ${result.actualizadas} actualizadas, ${result.acuerdos_creados} acuerdos creados.`
        );
        this.importUbicacionesTexto = '';
        this.cargarAcuerdos();
        this.cargarProveedores();
        this.cargarMapaUbicaciones();
        this.cargarCobranzasEjecutivas();
        this.cargarEstadisticas();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudieron importar las ubicaciones.');
        this.loading.set(false);
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

  abrirSelectorUbicacion(index: number): void {
    const ubicacion = this.ubicaciones[index];
    this.mapaSucursal = ubicacion?.codigo ? ubicacion.sucursal : 'aregua';
    this.limpiarFiltrosMapa();
    this.selectorUbicacionIndex.set(index);
    this.cargarMapaUbicaciones();
  }

  cerrarSelectorUbicacion(): void {
    this.selectorUbicacionIndex.set(null);
  }

  seleccionarUbicacionDesdeMapa(lugar: any): void {
    const index = this.selectorUbicacionIndex();
    if (index === null || !lugar) {
      return;
    }
    this.ubicaciones = this.ubicaciones.map((item, itemIndex) => (
      itemIndex === index
        ? {
            ...item,
            sucursal: lugar.sucursal,
            tipo_espacio: lugar.tipo_espacio,
            ubicacion: lugar.codigo,
            codigo: lugar.codigo,
            bloque: lugar.bloque,
            numero: lugar.numero,
            valor_gs: lugar.valor_gs ?? item.valor_gs,
            detalle: lugar.detalle || item.detalle || '',
          }
        : item
    ));
    this.cerrarSelectorUbicacion();
  }

  trackByIndex(index: number): number {
    return index;
  }

  ubicacionesPorTipo(ubicaciones: AcuerdoUbicacion[]): Array<{ tipo: string; items: AcuerdoUbicacion[] }> {
    const order = ['linea_caja', 'puntera', 'pestana', 'tramo_gondola', 'isla', 'espacio_gondola_frio'];
    return order
      .map((tipo) => ({
        tipo,
        items: (ubicaciones || []).filter((ubicacion) => {
          const codigo = String(ubicacion.codigo || ubicacion.ubicacion || '').toUpperCase();
          return tipo === 'linea_caja'
            ? codigo.startsWith('LC-')
            : ubicacion.tipo_espacio === tipo && !codigo.startsWith('LC-');
        }),
      }))
      .filter((group) => group.items.length > 0);
  }

  contarPestanas(ubicaciones: AcuerdoUbicacion[] = []): number {
    return ubicaciones.filter((ubicacion) => ubicacion.tipo_espacio === 'pestana').length;
  }

  contarLineaCaja(ubicaciones: AcuerdoUbicacion[] = []): number {
    return ubicaciones.filter((ubicacion) => String(ubicacion.codigo || ubicacion.ubicacion || '').toUpperCase().startsWith('LC-')).length;
  }

  alquilerTotal(ubicaciones: AcuerdoUbicacion[] = []): number {
    return ubicaciones.reduce((acc, ubicacion) => acc + (Number(ubicacion.valor_gs) || 0), 0);
  }

  acuerdosDelProveedor(proveedorId: number): AcuerdoComercial[] {
    return this.acuerdos().filter((item) => Number(item.proveedor_id) === Number(proveedorId) && item.activo);
  }

  ingresoMensualProveedor(proveedorId: number): number {
    return this.acuerdosDelProveedor(proveedorId).reduce(
      (acc, acuerdo) => acc + this.alquilerTotal(acuerdo.ubicaciones.filter((ubicacion) => !ubicacion.tentativa)),
      0,
    );
  }

  sucursalesProveedor(proveedorId: number): string {
    const sucursales = new Set<string>();
    this.acuerdosDelProveedor(proveedorId).forEach((acuerdo) => {
      acuerdo.ubicaciones.forEach((ubicacion) => sucursales.add(this.sucursalLabel(ubicacion.sucursal)));
    });
    return [...sucursales].sort().join(', ') || '-';
  }

  riesgoVencimientoProveedor(proveedorId: number): { acuerdos: number; valor: number; label: string } {
    const riesgos = this.acuerdosDelProveedor(proveedorId).filter((acuerdo) => {
      const dias = this.diasParaVencimiento(acuerdo);
      return dias !== null && dias <= 90;
    });
    const valor = riesgos.reduce((acc, acuerdo) => acc + this.alquilerTotal(acuerdo.ubicaciones), 0);
    return {
      acuerdos: riesgos.length,
      valor,
      label: riesgos.length ? `${riesgos.length} acuerdo${riesgos.length === 1 ? '' : 's'} en riesgo` : 'Sin riesgo a 90 dias',
    };
  }

  cobranzaProveedor(proveedorId: number): { estado: string; facturado: number; cobrado: number; pendiente: number; className: string } {
    const rows = this.cobranzasEjecutivas().filter((item) => Number(item.proveedor_id) === Number(proveedorId));
    const facturado = rows.reduce((acc, item) => acc + (Number(item.monto_factura) || 0), 0);
    const cobrado = rows.filter((item) => item.cobrado).reduce((acc, item) => acc + (Number(item.monto_factura) || 0), 0);
    const pendiente = Math.max(facturado - cobrado, 0);
    const tieneFactura = rows.some((item) => String(item.numero_factura || '').trim() || Number(item.monto_factura || 0) > 0);
    if (!tieneFactura) {
      return { estado: 'Sin facturacion del mes', facturado, cobrado, pendiente, className: 'exec-warning' };
    }
    if (pendiente <= 0) {
      return { estado: 'Al dia', facturado, cobrado, pendiente, className: 'exec-ok' };
    }
    if (cobrado > 0) {
      return { estado: 'Cobranza parcial', facturado, cobrado, pendiente, className: 'exec-warning' };
    }
    return { estado: 'Pendiente de cobro', facturado, cobrado, pendiente, className: 'exec-risk' };
  }

  esUbicacionSinValor(ubicacion: AcuerdoUbicacion): boolean {
    return !Number(ubicacion?.valor_gs || 0);
  }

  ubicacionesRegistradasPorTipo(tipo: string): Set<string> {
    return new Set([
      ...this.mapaUbicaciones()
        .filter((ubicacion) => ubicacion.tipo_espacio === tipo)
        .filter((ubicacion) => this.tieneCodigoPropio(ubicacion.codigo || ubicacion.ubicacion))
        .filter((ubicacion) => !this.esUbicacionLibre(ubicacion) || Number(ubicacion.valor_gs || 0) > 0)
        .filter((ubicacion) => !this.excluirDeKpiTipo(tipo, ubicacion.codigo || ubicacion.ubicacion))
        .map((ubicacion) => this.ubicacionKey(ubicacion.sucursal, ubicacion.codigo || ubicacion.ubicacion)),
      ...this.acuerdos()
        .flatMap((acuerdo) => acuerdo.ubicaciones)
        .filter((ubicacion) => ubicacion.tipo_espacio === tipo)
        .filter((ubicacion) => this.tieneCodigoPropio(ubicacion.codigo || ubicacion.ubicacion))
        .filter((ubicacion) => !this.excluirDeKpiTipo(tipo, ubicacion.codigo || ubicacion.ubicacion))
        .map((ubicacion) => this.ubicacionKey(ubicacion.sucursal, ubicacion.codigo || ubicacion.ubicacion)),
    ].filter(Boolean));
  }

  ubicacionesOcupadasPorTipo(tipo: string): Set<string> {
    return new Set(this.acuerdos()
      .filter((acuerdo) => acuerdo.activo)
      .flatMap((acuerdo) => acuerdo.ubicaciones)
      .filter((ubicacion) => !ubicacion.tentativa)
      .filter((ubicacion) => ubicacion.tipo_espacio === tipo)
      .filter((ubicacion) => this.tieneCodigoPropio(ubicacion.codigo || ubicacion.ubicacion))
      .filter((ubicacion) => !this.excluirDeKpiTipo(tipo, ubicacion.codigo || ubicacion.ubicacion))
      .map((ubicacion) => this.ubicacionKey(ubicacion.sucursal, ubicacion.codigo || ubicacion.ubicacion))
      .filter(Boolean));
  }

  ocupacionKpisPorTipo(tipo: string, labelTipo: string): Array<{ label: string; ocupadas: number; total: number }> {
    const sectores = [
      { key: 'bloques', label: 'Bloques' },
      { key: 'perfumeria', label: 'Perfumeria' },
      { key: 'panaderia', label: 'Panaderia' },
      { key: 'linea_caja', label: 'LC' },
    ];
    return sectores
      .map((sector) => ({
        label: `${labelTipo} ${sector.label}`,
        ocupadas: this.ubicacionesOcupadasPorTipoSector(tipo, sector.key).size,
        total: this.ubicacionesRegistradasPorTipoSector(tipo, sector.key).size,
      }))
      .filter((item) => item.total > 0);
  }

  ubicacionesRegistradasPorTipoSector(tipo: string, sector: string): Set<string> {
    return new Set([
      ...this.mapaUbicaciones()
        .filter((ubicacion) => ubicacion.tipo_espacio === tipo)
        .filter((ubicacion) => this.sectorUbicacion(ubicacion) === sector)
        .filter((ubicacion) => this.tieneCodigoPropio(ubicacion.codigo || ubicacion.ubicacion))
        .filter((ubicacion) => !this.esUbicacionLibre(ubicacion) || Number(ubicacion.valor_gs || 0) > 0)
        .filter((ubicacion) => sector === 'linea_caja' || !this.excluirDeKpiTipo(tipo, ubicacion.codigo || ubicacion.ubicacion))
        .map((ubicacion) => this.ubicacionKey(ubicacion.sucursal, ubicacion.codigo || ubicacion.ubicacion)),
      ...this.acuerdos()
        .flatMap((acuerdo) => acuerdo.ubicaciones)
        .filter((ubicacion) => ubicacion.tipo_espacio === tipo)
        .filter((ubicacion) => this.sectorUbicacion(ubicacion) === sector)
        .filter((ubicacion) => this.tieneCodigoPropio(ubicacion.codigo || ubicacion.ubicacion))
        .filter((ubicacion) => sector === 'linea_caja' || !this.excluirDeKpiTipo(tipo, ubicacion.codigo || ubicacion.ubicacion))
        .map((ubicacion) => this.ubicacionKey(ubicacion.sucursal, ubicacion.codigo || ubicacion.ubicacion)),
    ].filter(Boolean));
  }

  ubicacionesOcupadasPorTipoSector(tipo: string, sector: string): Set<string> {
    return new Set(this.acuerdos()
      .filter((acuerdo) => acuerdo.activo)
      .flatMap((acuerdo) => acuerdo.ubicaciones)
      .filter((ubicacion) => !ubicacion.tentativa)
      .filter((ubicacion) => ubicacion.tipo_espacio === tipo)
      .filter((ubicacion) => this.sectorUbicacion(ubicacion) === sector)
      .filter((ubicacion) => this.tieneCodigoPropio(ubicacion.codigo || ubicacion.ubicacion))
      .filter((ubicacion) => sector === 'linea_caja' || !this.excluirDeKpiTipo(tipo, ubicacion.codigo || ubicacion.ubicacion))
      .map((ubicacion) => this.ubicacionKey(ubicacion.sucursal, ubicacion.codigo || ubicacion.ubicacion))
      .filter(Boolean));
  }

  sectorUbicacion(ubicacion: { bloque?: string | null; codigo?: string | null; ubicacion?: string | null }): string {
    const bloque = String(ubicacion.bloque || this.bloqueDesdeCodigo(ubicacion.codigo || ubicacion.ubicacion) || '').trim().toUpperCase();
    if (bloque === 'PAN') {
      return 'panaderia';
    }
    if (bloque === 'LC') {
      return 'linea_caja';
    }
    if (bloque === 'PA' || bloque === 'PB') {
      return 'perfumeria';
    }
    return 'bloques';
  }

  tieneCodigoPropio(codigo?: string | null): boolean {
    const value = String(codigo || '').trim();
    return Boolean(value) && !/^sin\s+/i.test(value);
  }

  excluirDeKpiTipo(tipo: string, codigo?: string | null): boolean {
    return tipo === 'puntera' && String(codigo || '').trim().toUpperCase().startsWith('LC-');
  }

  ubicacionKey(sucursal?: string | null, codigo?: string | null): string {
    const cleanCodigo = String(codigo || '').trim().toUpperCase();
    return cleanCodigo ? `${String(sucursal || '').trim().toLowerCase()}|${cleanCodigo}` : '';
  }

  mapaUbicacionesPorBloque(bloque: string, numeros = Array.from({ length: 13 }, (_, index) => index + 1)): Array<{ numero: number; puntera?: any; punteraCatalogo?: any; pestanas: any[]; pestanasCatalogo: any[] }> {
    const ubicaciones = this.mapaUbicacionesConNegociaciones()
      .filter((ubicacion) => ubicacion.sucursal === this.mapaSucursal)
      .filter((ubicacion) => (ubicacion.bloque || this.bloqueDesdeCodigo(ubicacion.codigo || ubicacion.ubicacion)) === bloque);
    const visibles = this.mapaUbicacionesFiltradas()
      .filter((ubicacion) => (ubicacion.bloque || this.bloqueDesdeCodigo(ubicacion.codigo || ubicacion.ubicacion)) === bloque);
    return numeros.map((numero) => {
      const items = visibles.filter((ubicacion) => Number(ubicacion.numero || this.numeroDesdeCodigo(ubicacion.codigo || ubicacion.ubicacion)) === numero);
      const catalogItems = ubicaciones.filter((ubicacion) => Number(ubicacion.numero || this.numeroDesdeCodigo(ubicacion.codigo || ubicacion.ubicacion)) === numero);
      const pestanasCatalogo = catalogItems.filter((ubicacion) => ubicacion.tipo_espacio === 'pestana');
      return {
        numero,
        puntera: items.find((ubicacion) => ubicacion.tipo_espacio === 'puntera'),
        punteraCatalogo: catalogItems.find((ubicacion) => ubicacion.tipo_espacio === 'puntera'),
        pestanasCatalogo,
        pestanas: items
          .filter((ubicacion) => ubicacion.tipo_espacio === 'pestana')
          .sort((a, b) => this.lateralOrden(a) - this.lateralOrden(b)),
      };
    });
  }

  mapaUbicacionesConNegociaciones(): MapaUbicacion[] {
    const tentativas = this.negociaciones().flatMap((acuerdo) =>
      acuerdo.ubicaciones.map((ubicacion) => ({
        id: ubicacion.id ?? 0,
        sucursal: ubicacion.sucursal,
        codigo: ubicacion.codigo || ubicacion.ubicacion,
        ubicacion: ubicacion.ubicacion,
        bloque: ubicacion.bloque || this.bloqueDesdeCodigo(ubicacion.codigo || ubicacion.ubicacion),
        numero: ubicacion.numero || this.numeroDesdeCodigo(ubicacion.codigo || ubicacion.ubicacion) || 0,
        tipo_espacio: ubicacion.tipo_espacio,
        valor_gs: ubicacion.valor_gs,
        detalle: ubicacion.detalle,
        acuerdo_id: acuerdo.id,
        vigencia_hasta: acuerdo.vigencia_hasta,
        estado_renovacion: 'en_negociacion',
        proveedor_nombre: acuerdo.proveedor_nombre,
      } as MapaUbicacion))
    ).filter((ubicacion) => Boolean(ubicacion.codigo));
    const tentativeKeys = new Set(tentativas.map((ubicacion) => `${ubicacion.sucursal}|${ubicacion.codigo}`));
    return [
      ...this.mapaUbicaciones().filter((ubicacion) => !tentativeKeys.has(`${ubicacion.sucursal}|${ubicacion.codigo}`)),
      ...tentativas,
    ];
  }

  mapaBloquesVisibles() {
    return this.mapaBloqueFiltroActivo()
      ? this.mapaBloques.filter((bloque) => bloque.key === this.mapaFiltroBloque)
      : this.mapaBloques;
  }

  mapaPerfumeriaBloquesVisibles() {
    return this.mapaBloqueFiltroActivo()
      ? this.mapaPerfumeriaBloques.filter((bloque) => bloque.key === this.mapaFiltroBloque)
      : this.mapaPerfumeriaBloques;
  }

  mapaLineaCajaBloquesVisibles() {
    return this.mapaBloqueFiltroActivo()
      ? this.mapaLineaCajaBloques.filter((bloque) => bloque.key === this.mapaFiltroBloque)
      : this.mapaLineaCajaBloques;
  }

  mapaPanaderiaBloquesVisibles() {
    return this.mapaBloqueFiltroActivo()
      ? this.mapaPanaderiaBloques.filter((bloque) => bloque.key === this.mapaFiltroBloque)
      : this.mapaPanaderiaBloques;
  }

  mapaBloqueFiltroActivo(): boolean {
    return Boolean(this.mapaFiltroBloque);
  }

  mapaUbicacionesFiltradas(): MapaUbicacion[] {
    return this.mapaUbicacionesConNegociaciones().filter((ubicacion) => {
      if (ubicacion.sucursal !== this.mapaSucursal) {
        return false;
      }
      if (this.mapaFiltroEstado === 'libres' && !this.esUbicacionLibre(ubicacion)) {
        return false;
      }
      if (this.mapaFiltroEstado === 'ocupados' && this.esUbicacionLibre(ubicacion)) {
        return false;
      }
      if (this.mapaFiltroProveedorId && Number(ubicacion.acuerdo_id || 0) > 0) {
        const acuerdo = this.acuerdos().find((item) => Number(item.id) === Number(ubicacion.acuerdo_id));
        if (Number(acuerdo?.proveedor_id) !== Number(this.mapaFiltroProveedorId)) {
          return false;
        }
      } else if (this.mapaFiltroProveedorId) {
        return false;
      }
      if (this.mapaFiltroTipo && ubicacion.tipo_espacio !== this.mapaFiltroTipo) {
        return false;
      }
      return true;
    });
  }

  limpiarFiltrosMapa(): void {
    this.mapaFiltroEstado = 'todos';
    this.mapaFiltroProveedorId = null;
    this.mapaFiltroBloque = '';
    this.mapaFiltroTipo = '';
  }

  lateralOrden(ubicacion: any): number {
    const value = String(ubicacion?.codigo || ubicacion?.ubicacion || '').toUpperCase();
    if (value.includes('-L2')) {
      return 1;
    }
    if (value.includes('-L1')) {
      return 2;
    }
    return 3;
  }

  lateralLabel(ubicacion: any): string {
    const value = String(ubicacion?.codigo || ubicacion?.ubicacion || '').toUpperCase();
    if (value.includes('-L2')) {
      return 'L2';
    }
    if (value.includes('-L1')) {
      return 'L1';
    }
    return ubicacion?.codigo || ubicacion?.ubicacion || '';
  }

  bloqueDesdeCodigo(value?: string | null): string {
    const text = String(value || '').trim().toUpperCase();
    if (/^A-P\d+/.test(text)) {
      return 'PA';
    }
    if (/^B-P\d+/.test(text)) {
      return 'PB';
    }
    if (/^LC-/.test(text)) {
      return 'LC';
    }
    if (/^PA-[AB]-P\d+/.test(text)) {
      return 'PAN';
    }
    const match = text.match(/^([A-D])-/i);
    return match ? match[1].toUpperCase() : '';
  }

  numeroDesdeCodigo(value?: string | null): number | null {
    const text = String(value || '').trim();
    const perfumeriaMatch = text.match(/^[AB]-P(\d+)/i);
    if (perfumeriaMatch) {
      return Number(perfumeriaMatch[1]);
    }
    const lineaCajaMatch = text.match(/^LC-(\d+)/i);
    if (lineaCajaMatch) {
      return Number(lineaCajaMatch[1]);
    }
    const panaderiaCodes: Record<string, number> = {
      'PA-A-P1': 1,
      'PA-A-P2': 2,
      'PA-B-P2': 3,
    };
    if (panaderiaCodes[text.toUpperCase()]) {
      return panaderiaCodes[text.toUpperCase()];
    }
    const match = text.match(/^[A-D]-(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  verMapaUbicacion(ubicacion: any): void {
    if (ubicacion) {
      this.mapaUbicacionDetalle.set(ubicacion);
      this.proveedorAsignacionId = null;
      this.mapaAsignacionValor = ubicacion.valor_gs ? String(ubicacion.valor_gs) : '';
    }
  }

  esUbicacionLibre(ubicacion: any): boolean {
    return !ubicacion?.acuerdo_id || String(ubicacion?.proveedor_nombre || '').trim().toLowerCase() === 'libre';
  }

  mapaEstadoClass(ubicacion: any): string {
    if (!ubicacion || this.esUbicacionLibre(ubicacion) || !ubicacion.acuerdo_id) {
      return 'map-free';
    }
    if (ubicacion.estado_renovacion === 'en_negociacion') {
      return 'map-negotiation';
    }
    const dias = this.diasParaVencimiento({ vigencia_hasta: ubicacion.vigencia_hasta } as AcuerdoComercial);
    if (dias !== null && dias <= 30) {
      return 'map-risk';
    }
    return 'map-occupied';
  }

  cerrarMapaUbicacion(): void {
    this.mapaUbicacionDetalle.set(null);
    this.proveedorAsignacionId = null;
    this.mapaAsignacionValor = '';
  }

  asignarMapaAProveedor(lugar: any): void {
    const proveedor = this.proveedores().find((item) => Number(item.id) === Number(this.proveedorAsignacionId));
    if (!proveedor) {
      this.error.set('Selecciona un proveedor para asignar la ubicacion.');
      return;
    }
    const acuerdoExistente = this.acuerdos().find((item) => Number(item.proveedor_id) === Number(proveedor.id) && item.activo);
    const nuevaUbicacion: AcuerdoUbicacion = {
      sucursal: lugar.sucursal,
      tipo_espacio: lugar.tipo_espacio,
      ubicacion: lugar.codigo,
      codigo: lugar.codigo,
      bloque: lugar.bloque,
      numero: lugar.numero,
      valor_gs: this.mapaAsignacionValor || lugar.valor_gs,
      detalle: lugar.detalle || '',
      orden: 1,
    };
    if (acuerdoExistente) {
      const confirmed = window.confirm(
        `El proveedor ya tiene un acuerdo activo: ${acuerdoExistente.titulo}. ` +
        'Se abrira para renegociacion y se agregara esta ubicacion. Confirma para continuar.'
      );
      if (!confirmed) {
        return;
      }
      this.editarAcuerdo(acuerdoExistente);
      this.estadoRenovacion = 'en_negociacion';
      if (!this.ubicaciones.some((item) => item.sucursal === nuevaUbicacion.sucursal && item.codigo === nuevaUbicacion.codigo)) {
        this.ubicaciones = [...this.ubicaciones, { ...nuevaUbicacion, orden: this.ubicaciones.length + 1 }];
      }
    } else {
      this.limpiarFormulario();
      this.proveedorId = proveedor.id;
      this.proveedorNombre = proveedor.nombre;
      this.proveedorRuc = proveedor.ruc ?? '';
      this.proveedorTelefono = proveedor.telefono ?? '';
      this.proveedorEmail = proveedor.email ?? '';
      this.titulo = `Acuerdo comercial ${proveedor.nombre}`;
      this.estadoRenovacion = 'en_negociacion';
      this.ubicaciones = [nuevaUbicacion];
      this.activeTab = 'negociaciones';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.ok.set('Ubicacion enviada al formulario de acuerdo. Revisa y guarda la renegociacion.');
    this.cerrarMapaUbicacion();
  }

  guardarValorMapaUbicacion(lugar: any): void {
    if (!this.canEditValoresUbicaciones()) {
      this.error.set('No tienes permisos para cambiar valores de ubicaciones.');
      return;
    }
    if (!lugar?.sucursal || !lugar?.codigo) {
      this.error.set('No se encontro la ubicacion del mapa.');
      return;
    }
    if (!String(this.mapaAsignacionValor || '').trim()) {
      this.error.set('Carga el valor fijo del lugar.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.saveMapaUbicacionValor({
      sucursal: lugar.sucursal,
      codigo: lugar.codigo,
      valor_gs: this.mapaAsignacionValor,
      detalle: lugar.detalle || '',
    }).subscribe({
      next: (saved) => {
        this.ok.set(`Valor actualizado. Acuerdos afectados: ${saved.acuerdos_actualizados || 0}.`);
        this.mapaUbicacionDetalle.set({ ...lugar, valor_gs: saved.valor_gs, detalle: saved.detalle });
        this.mapaAsignacionValor = String(saved.valor_gs ?? '');
        this.cargarMapaUbicaciones();
        this.cargarAcuerdos();
        this.cargarEstadisticas();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar el valor del lugar.');
        this.loading.set(false);
      },
    });
  }

  abrirNegociacion(acuerdo: AcuerdoComercial): void {
    this.editarAcuerdo(acuerdo);
    this.activeTab = 'negociaciones';
  }

  formTitle(): string {
    if (this.activeTab === 'negociaciones') {
      return this.editId ? 'Editar negociacion' : 'Nueva negociacion';
    }
    return this.editId ? 'Editar acuerdo' : 'Nuevo acuerdo';
  }

  abrirAcuerdoActualDesdeMapa(lugar: any): void {
    const acuerdoId = Number(lugar?.acuerdo_id);
    const acuerdo = this.acuerdos().find((item) => Number(item.id) === acuerdoId);
    if (!acuerdo) {
      this.error.set('No se encontro el acuerdo actual de esta ubicacion.');
      return;
    }
    this.editarAcuerdo(acuerdo);
    this.activeTab = 'negociaciones';
    this.estadoRenovacion = 'en_negociacion';
    this.ok.set('Acuerdo actual abierto para renegociacion. Puedes quitar la ubicacion y guardar.');
    this.cerrarMapaUbicacion();
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

  sucursalLabel(value?: string | null): string {
    return this.sucursales.find((item) => item.slug === value)?.nombre ?? (value || '-');
  }

  sucursalClass(value?: string | null): string {
    return `sucursal-${String(value || '').trim().toLowerCase() || 'none'}`;
  }

  ubicacionClass(ubicacion: AcuerdoUbicacion): Record<string, boolean> {
    return {
      [this.sucursalClass(ubicacion.sucursal)]: true,
      'ubicacion-sin-valor': this.esUbicacionSinValor(ubicacion),
    };
  }

  ocupacionPorcentaje(item: { total: number; ocupadas: number }): number {
    const total = Number(item.total) || 0;
    if (!total) {
      return 0;
    }
    return Math.round(((Number(item.ocupadas) || 0) / total) * 100);
  }

  ocupacionAgrupada(items: AcuerdosEstadisticasResponse['ocupacion']): AcuerdosEstadisticasResponse['ocupacion'] {
    const grupos = new Map<string, AcuerdosEstadisticasResponse['ocupacion'][number]>();
    for (const item of items || []) {
      const bloque = this.bloqueOcupacionKey(item.bloque);
      const key = `${item.sucursal}|${item.tipo_espacio}|${bloque}`;
      const actual = grupos.get(key);
      if (!actual) {
        grupos.set(key, { ...item, bloque });
        continue;
      }
      actual.total += Number(item.total) || 0;
      actual.ocupadas += Number(item.ocupadas) || 0;
      actual.libres += Number(item.libres) || 0;
      actual.potencial_libre += Number(item.potencial_libre) || 0;
    }
    return Array.from(grupos.values());
  }

  ocupacionPorSucursal(items: AcuerdosEstadisticasResponse['ocupacion']): Array<{
    sucursal: string;
    total: number;
    ocupadas: number;
    items: AcuerdosEstadisticasResponse['ocupacion'];
  }> {
    const grupos = new Map<string, {
      sucursal: string;
      total: number;
      ocupadas: number;
      items: AcuerdosEstadisticasResponse['ocupacion'];
    }>();
    for (const item of this.ocupacionAgrupada(items)) {
      const sucursal = String(item.sucursal || '').trim().toLowerCase() || 'sin_sucursal';
      const grupo = grupos.get(sucursal) ?? { sucursal, total: 0, ocupadas: 0, items: [] };
      grupo.total += Number(item.total) || 0;
      grupo.ocupadas += Number(item.ocupadas) || 0;
      grupo.items.push(item);
      grupos.set(sucursal, grupo);
    }
    return Array.from(grupos.values()).sort((a, b) => this.sucursalLabel(a.sucursal).localeCompare(this.sucursalLabel(b.sucursal)));
  }

  bloqueOcupacionKey(value?: string | null): string {
    const bloque = String(value || '').trim().toUpperCase();
    if (bloque === 'PA' || bloque === 'PB') {
      return 'PERFUMERIA';
    }
    return ['A', 'B', 'C', 'D'].includes(bloque) ? 'ABCD' : bloque;
  }

  tipoEspacioLabel(value?: string | null): string {
    if (value === 'linea_caja') {
      return 'Linea de caja';
    }
    return this.tiposEspacio.find((item) => item.value === value)?.label ?? (value || '-');
  }

  bloqueOcupacionLabel(value?: string | null): string {
    const bloque = String(value || '').trim().toUpperCase();
    if (!bloque) {
      return 'Sin bloque';
    }
    if (bloque === 'PAN') {
      return 'Panaderia';
    }
    if (bloque === 'LC') {
      return 'Linea de caja';
    }
    if (bloque === 'ABCD') {
      return 'Bloques A/B/C/D';
    }
    if (bloque === 'PERFUMERIA') {
      return 'Perfumeria';
    }
    if (bloque === 'PA' || bloque === 'PB') {
      return `Perfumeria ${bloque}`;
    }
    return `Bloque ${bloque}`;
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
