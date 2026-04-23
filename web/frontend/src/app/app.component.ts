import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AdminUser,
  AdminUsersData,
  DashboardData,
  DashboardService,
  CompraFaenaLote,
  ComprasFaenaData,
  CurrentUser,
  DistribucionLote,
  DistribucionLocal,
  DistribucionRow,
  DistribucionesData,
  FlotaCatalogosData,
  FlotaCombustibleRow,
  FlotaCombustibleImportPreviewResult,
  FlotaCombustibleImportPreviewRow,
  FlotaGastoRow,
  FlotaProveedor,
  FlotaResumenSemanalData,
  FlotaTipoGasto,
  FlotaVehiculo,
  LoteResumen,
  MenudenciaSucursal,
  RecepcionDistribucion,
  RecepcionData,
  RecepcionMenudencia,
  RecepcionSucursalSlug,
  ResumenesData,
  TopMenudencia,
} from './services/dashboard.service';

type AppView = 'dashboard' | 'compras-faena' | 'resumenes' | 'recepcion' | 'distribuciones' | 'usuarios' | 'flota';
type FlotaSection = 'resumen' | 'vehiculos' | 'combustible' | 'gastos';

type OptionalKpiKey =
  | 'lotes'
  | 'reces_compradas'
  | 'reces_faenadas'
  | 'reces_distribuidas'
  | 'kg_distribuidos'
  | 'monto_total'
  | 'costo_kg_promedio';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly kpiStorageKey = 'reces-dashboard-kpis';
  private readonly themeStorageKey = 'reces-dashboard-theme';
  @ViewChild('recepcionKgInput') recepcionKgInput?: ElementRef<HTMLInputElement>;
  vista: AppView = 'dashboard';
  viewMenuOpen = false;
  darkMode = false;
  desde = '';
  hasta = '';
  periodoSeleccionado = 'mes-actual';
  busqueda = '';
  recepcionSucursal: RecepcionSucursalSlug = 'itaugua';
  sucursalesRecepcion: Array<{ slug: RecepcionSucursalSlug; nombre: string }> = [
    { slug: 'itaugua', nombre: 'Itaugua' },
    { slug: 'luque', nombre: 'Luque' },
    { slug: 'aregua', nombre: 'Aregua' },
  ];
  localesDistribucion = ['LUQUE', 'AREGUA', 'ITAUGUA'];
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
  kpiMenuOpen = false;
  recepcionFecha = new Date().toISOString().slice(0, 10);
  recepcionBusqueda = '';
  menuBusqueda = '';
  seleccionadoId: number | null = null;
  recepcionKg = '';
  recepcionFaltante = '';
  recepcionSobrante = '';
  recepcionRegistradoPor = '';
  recepcionNota = '';
  nuevoProducto = '';
  nuevoKg = '';
  nuevoUnidades = '';
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
  compraBusqueda = '';
  compraLoteId: number | null = null;
  compraLoteManualOverride = false;
  compraDesde = '';
  compraHasta = '';
  compraEditModalOpen = false;
  faenaModalOpen = false;
  compraLote = '';
  compraEmpresa = 'Corral';
  compraFecha = new Date().toISOString().slice(0, 10);
  compraCantidad = '';
  compraMonto = '';
  compraPesoKg = '';
  modalCompraLote = '';
  modalCompraEmpresa = 'Corral';
  modalCompraFecha = new Date().toISOString().slice(0, 10);
  modalCompraCantidad = '';
  modalCompraMonto = '';
  modalCompraPesoKg = '';
  faenaFecha = new Date().toISOString().slice(0, 10);
  faenaCantidad = '';
  faenaNota = '';
  faenaAjusteFecha = new Date().toISOString().slice(0, 10);
  faenaAjusteCantidad = '';
  faenaAjusteNota = '';
  resumenFiltro = 'Todos';
  resumenEmpresa = 'Todas';
  resumenDesde = '';
  resumenHasta = '';
  resumenBusqueda = '';
  resumenMaxFilas = 500;
  resumenSeleccionados = new Set<number>();
  usuarioNombre = '';
  usuarioUsername = '';
  usuarioPassword = '';
  usuarioRol = 'recepcion';
  usuarioSucursalPermitida = 'luque';
  usuarioActivo = true;
  usuarioPasswordEditId: number | null = null;
  usuarioPasswordNueva = '';
  flotaSeccion: FlotaSection = 'resumen';
  flotaMes = new Date().getMonth() + 1;
  flotaSemana = this.flotaMes;
  flotaAnho = new Date().getFullYear();
  flotaFechaReferencia = new Date().toISOString().slice(0, 10);
  flotaFiltroSucursal = '';
  flotaVehiculoId: number | null = null;
  flotaGastoVehiculoId: number | null = null;
  flotaResumenVehiculoId: number | null = null;
  flotaTipoGastoFiltroId: number | null = null;
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
  combustibleFecha = new Date().toISOString().slice(0, 10);
  combustibleDesde = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  combustibleHasta = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
  combustibleVehiculoId: number | null = null;
  combustibleProveedorId: number | null = null;
  combustibleImportProveedorId: number | null = null;
  combustibleImportFile: File | null = null;
  combustibleImportFileName = '';
  combustibleTipo = 'OPTIMO DIESEL';
  combustibleLitros = '';
  combustibleImporte = '';
  combustibleFactura = '';
  combustibleObservacion = '';
  gastoFecha = new Date().toISOString().slice(0, 10);
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
  recepcionLoading = signal(false);
  distribucionLoading = signal(false);
  compraLoading = signal(false);
  resumenLoading = signal(false);
  usuariosLoading = signal(false);
  flotaLoading = signal(false);
  authLoading = signal(true);
  error = signal('');
  authError = signal('');
  recepcionError = signal('');
  recepcionOk = signal('');
  distribucionError = signal('');
  distribucionOk = signal('');
  usuariosError = signal('');
  usuariosOk = signal('');
  flotaError = signal('');
  flotaOk = signal('');
  ultimaActualizacion = signal('');
  currentUser = signal<CurrentUser | null>(null);
  data = signal<DashboardData | null>(null);
  recepcion = signal<RecepcionData | null>(null);
  distribuciones = signal<DistribucionesData | null>(null);
  comprasFaena = signal<ComprasFaenaData | null>(null);
  resumenes = signal<ResumenesData | null>(null);
  adminUsers = signal<AdminUsersData | null>(null);
  flotaCatalogos = signal<FlotaCatalogosData | null>(null);
  flotaCombustible = signal<FlotaCombustibleRow[]>([]);
  flotaCombustibleImportPreview = signal<FlotaCombustibleImportPreviewRow[]>([]);
  flotaCombustibleImportPreviewSummary = signal<FlotaCombustibleImportPreviewResult | null>(null);
  flotaGastos = signal<FlotaGastoRow[]>([]);
  flotaResumen = signal<FlotaResumenSemanalData | null>(null);
  readonly tiposCombustible = ['SUPREMA 97', 'OPTIMO DIESEL', 'DIESEL MAX S10'];

  lotesFiltrados = computed(() => {
    const term = this.busqueda.trim().toLowerCase();
    const lotes = this.data()?.lotes ?? [];
    if (!term) {
      return lotes;
    }
    return lotes.filter((lote) => this.loteMatches(lote, term));
  });

  rangoTexto = computed(() => {
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
  });

  recesPendientes = computed(() => {
    const resumen = this.data()?.resumen;
    if (!resumen) {
      return 0;
    }
    return Math.max(Number(resumen.reces_faenadas) - Number(resumen.reces_distribuidas), 0);
  });

  distribucionesFiltradas = computed(() => {
    const term = this.recepcionBusqueda.trim().toLowerCase();
    const rows = this.recepcion()?.distribuciones ?? [];
    if (!term) {
      return rows;
    }
    return rows.filter((row) =>
      [row.fecha, row.lote, row.origen, row.nota].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    );
  });

  menudenciasFiltradas(): RecepcionMenudencia[] {
    const term = this.menuBusqueda.trim().toLowerCase();
    const rows = this.recepcion()?.menudencias ?? [];
    if (!term) {
      return rows;
    }
    return rows.filter((row) => row.producto.toLowerCase().includes(term));
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

  loteDistribucionSeleccionado = computed(() => {
    const loteId = this.distribucionLoteId;
    return (this.distribuciones()?.lotes ?? []).find((lote) => lote.id === loteId) ?? null;
  });

  distribucionTotalCabezas = computed(() => {
    return (this.distribuciones()?.distribuciones ?? []).reduce((acc, row) => acc + (Number(row.cabezas) || 0), 0);
  });

  distribucionTotalKg = computed(() => {
    return (this.distribuciones()?.distribuciones ?? []).reduce((acc, row) => acc + (Number(row.kg) || 0), 0);
  });

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

  compraLotesFiltrados = computed(() => {
    const term = this.compraBusqueda.trim().toLowerCase();
    const desde = this.compraDesde || '';
    const hasta = this.compraHasta || '';
    const lotes = this.comprasFaena()?.lotes ?? [];
    return lotes.filter((lote) =>
      (!desde || lote.fecha >= desde)
      && (!hasta || lote.fecha <= hasta)
      && (!term || [lote.id, lote.lote, lote.empresa, lote.fecha].some((value) => String(value ?? '').toLowerCase().includes(term))),
    );
  });

  compraLoteSeleccionado = computed(() => {
    const loteId = this.compraLoteId;
    return (this.comprasFaena()?.lotes ?? []).find((lote) => lote.id === loteId) ?? null;
  });

  resumenLotesFiltrados = computed(() => {
    const data = this.resumenes();
    if (!data) {
      return [];
    }
    const term = this.resumenBusqueda.trim().toLowerCase();
    const desde = this.resumenDesde || '';
    const hasta = this.resumenHasta || '';
    let rows = data.lotes.filter((lote) => {
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
    rows = rows.slice(0, Number(this.resumenMaxFilas) || 500);
    return rows;
  });

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

  maxDistribucionKg = computed(() => {
    const rows = this.data()?.distribucionesPorLocal ?? [];
    return Math.max(...rows.map((row) => Number(row.kg) || 0), 1);
  });

  maxMenudenciaKg = computed(() => {
    const rows = this.data()?.menudenciasPorSucursal ?? [];
    return Math.max(...rows.map((row) => Number(row.kg) || 0), 1);
  });

  maxTopMenudenciaKg = computed(() => {
    const rows = this.data()?.topMenudencias ?? [];
    return Math.max(...rows.map((row) => Number(row.kg) || 0), 1);
  });

  userDisplayName = computed(() => this.currentUser()?.nombre || 'Sin sesion');

  userRoleLabel = computed(() => {
    const role = this.currentUser()?.rol;
    if (role === 'admin') {
      return 'Administrador';
    }
    if (role === 'supervisor') {
      return 'Supervisor';
    }
    if (role === 'recepcion') {
      return 'Recepcion';
    }
    return 'Invitado';
  });

  userInitials = computed(() => {
    const name = this.currentUser()?.nombre?.trim() || this.currentUser()?.username?.trim() || '';
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'RC';
  });

  canManageOperations = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });

  canViewAnalytics = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });

  canManageRecepcion = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor' || role === 'recepcion';
  });

  canManageUsers = computed(() => this.currentUser()?.rol === 'admin');
  canManageFlota = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor' || role === 'recepcion';
  });
  canManageFlotaProviders = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });
  canManageFlotaVehiculos = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });
  canEditMenudencias = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });
  canImportFlotaCombustible = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });

  recepcionSucursalBloqueada = computed(() => {
    const user = this.currentUser();
    return user?.rol === 'recepcion' ? (user.sucursal_permitida ?? null) : null;
  });

  flotaSucursalBloqueada = computed(() => {
    const user = this.currentUser();
    return user?.rol === 'recepcion' ? (user.sucursal_permitida ?? null) : null;
  });

  flotaVehiculosVisibles = computed(() => {
    const blocked = String(this.flotaSucursalBloqueada() ?? '').trim().toLowerCase();
    const items = this.flotaCatalogos()?.vehiculos ?? [];
    if (!blocked) {
      return items;
    }
    return items.filter((item) => String(item.sucursal ?? '').trim().toLowerCase() === blocked);
  });
  flotaVehiculosActivos = computed(() => this.flotaVehiculosVisibles().filter((item) => item.activo));
  flotaProveedoresCombustible = computed(() => (this.flotaCatalogos()?.proveedores ?? []).filter((item) => item.activo && item.tipo === 'combustible'));
  flotaProveedoresActivos = computed(() => (this.flotaCatalogos()?.proveedores ?? []).filter((item) => item.activo));
  flotaTiposGastoActivos = computed(() => (this.flotaCatalogos()?.tiposGasto ?? []).filter((item) => item.activo && item.nombre !== 'combustible'));
  flotaTotalLitros = computed(() => this.flotaResumen()?.totales.litros ?? 0);
  flotaTotalGeneral = computed(() => this.flotaResumen()?.totales.total_general ?? 0);
  flotaTotalCombustible = computed(() => this.flotaResumen()?.totales.combustible_total ?? 0);
  flotaTotalOtros = computed(() => this.flotaResumen()?.totales.otros_gastos ?? 0);
  flotaMaxVehiculoTotal = computed(() => Math.max(...(this.flotaResumen()?.items ?? []).map((item) => Number(item.total_general) || 0), 1));
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

  loginUsername = '';
  loginPassword = '';

  constructor(private readonly dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.cargarPreferenciasKpis();
    this.cargarPreferenciaTema();
    this.setPeriodoSeleccionado();
    this.setComprasFaenaRangoDefault();
    this.restoreSession();
  }

  restoreSession(): void {
    this.authLoading.set(true);
    this.authError.set('');
    this.dashboardService.getCurrentUser().subscribe({
      next: ({ user }) => {
        this.currentUser.set(user);
        this.syncRecepcionScopeFromUser();
        this.ensureVistaPermitida();
        this.authLoading.set(false);
        this.cargarTodoInicial();
      },
      error: (err) => {
        this.currentUser.set(null);
        this.authLoading.set(false);
        if (err?.status && err.status !== 401) {
          this.authError.set(err?.error?.error ?? 'No se pudo verificar la sesion.');
        }
      },
    });
  }

  login(): void {
    this.authLoading.set(true);
    this.authError.set('');
    this.dashboardService.login({
      username: this.loginUsername,
      password: this.loginPassword,
    }).subscribe({
      next: ({ user }) => {
        this.currentUser.set(user);
        this.syncRecepcionScopeFromUser();
        this.ensureVistaPermitida();
        this.loginPassword = '';
        this.authLoading.set(false);
        this.cargarTodoInicial();
      },
      error: (err) => {
        this.currentUser.set(null);
        this.authError.set(err?.error?.error ?? 'No se pudo iniciar sesion.');
        this.authLoading.set(false);
      },
    });
  }

  logout(): void {
    this.authLoading.set(true);
    this.authError.set('');
    this.dashboardService.logout().subscribe({
      next: () => {
        this.currentUser.set(null);
        this.recepcionSucursal = 'itaugua';
        this.loginPassword = '';
        this.authLoading.set(false);
        this.limpiarDatosCargados();
      },
      error: (err) => {
        this.authError.set(err?.error?.error ?? 'No se pudo cerrar sesion.');
        this.authLoading.set(false);
      },
    });
  }

  private cargarTodoInicial(): void {
    if (this.canViewAnalytics()) {
      this.cargar();
      this.cargarResumenes();
    }
    this.cargarRecepcion();
    if (this.canManageOperations()) {
      this.cargarDistribuciones();
      this.cargarComprasFaena();
    }
    if (this.canManageUsers()) {
      this.cargarUsuarios();
    }
    if (this.canManageFlota()) {
      this.cargarFlota();
    }
  }

  private limpiarDatosCargados(): void {
    this.data.set(null);
    this.recepcion.set(null);
    this.distribuciones.set(null);
    this.comprasFaena.set(null);
    this.resumenes.set(null);
    this.adminUsers.set(null);
    this.flotaCatalogos.set(null);
    this.flotaCombustible.set([]);
    this.flotaGastos.set([]);
    this.flotaResumen.set(null);
    this.ultimaActualizacion.set('');
    this.error.set('');
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.distribucionError.set('');
    this.distribucionOk.set('');
    this.usuariosError.set('');
    this.usuariosOk.set('');
    this.flotaError.set('');
    this.flotaOk.set('');
  }

  private syncRecepcionScopeFromUser(): void {
    const blocked = this.recepcionSucursalBloqueada();
    if (blocked) {
      this.recepcionSucursal = blocked;
    }
    const flotaBlocked = this.flotaSucursalBloqueada();
    if (flotaBlocked) {
      this.flotaFiltroSucursal = flotaBlocked;
      this.vehiculoSucursal = flotaBlocked;
    }
  }

  private ensureVistaPermitida(): void {
    if (this.vista === 'usuarios' && !this.canManageUsers()) {
      this.vista = this.canManageRecepcion() ? 'recepcion' : 'dashboard';
      return;
    }
    if ((this.vista === 'dashboard' || this.vista === 'resumenes') && !this.canViewAnalytics()) {
      this.vista = this.canManageRecepcion() ? 'recepcion' : 'dashboard';
      return;
    }
    if ((this.vista === 'compras-faena' || this.vista === 'distribuciones') && !this.canManageOperations()) {
      this.vista = this.canManageRecepcion() ? 'recepcion' : 'dashboard';
      return;
    }
    if (this.vista === 'flota' && !this.canManageFlota()) {
      this.vista = this.canManageRecepcion() ? 'recepcion' : 'dashboard';
      return;
    }
    if (this.vista === 'recepcion' && !this.canManageRecepcion()) {
      this.vista = 'dashboard';
    }
  }

  cargar(): void {
    if (!this.canViewAnalytics()) {
      return;
    }
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

  limpiarFiltros(): void {
    this.periodoSeleccionado = 'todos';
    this.desde = '';
    this.hasta = '';
    this.resumenDesde = '';
    this.resumenHasta = '';
    this.busqueda = '';
    this.cargar();
  }

  aplicarPeriodo(): void {
    this.setPeriodoSeleccionado();
    this.cargar();
    if (this.resumenes()) {
      this.cargarResumenes();
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
      default:
        start = null;
        end = null;
    }

    this.desde = start ? this.toIsoDate(start) : '';
    this.hasta = end ? this.toIsoDate(end) : '';
  }

  private getIsoWeekFromDate(input: Date): { week: number; year: number } {
    const value = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
    const day = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((value.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { week, year: value.getUTCFullYear() };
  }

  private getCurrentIsoWeek(): { week: number; year: number } {
    return this.getIsoWeekFromDate(new Date());
  }

  private getIsoWeekStartDate(week: number, year: number): Date {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
    const target = new Date(mondayWeek1);
    target.setUTCDate(mondayWeek1.getUTCDate() + ((Number(week) || 1) - 1) * 7);
    return new Date(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleKpi(key: OptionalKpiKey, visible: boolean): void {
    this.visibleKpis = { ...this.visibleKpis, [key]: visible };
    localStorage.setItem(this.kpiStorageKey, JSON.stringify(this.visibleKpis));
  }

  toggleKpiMenu(): void {
    this.kpiMenuOpen = !this.kpiMenuOpen;
  }

  toggleViewMenu(): void {
    this.viewMenuOpen = !this.viewMenuOpen;
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem(this.themeStorageKey, this.darkMode ? 'dark' : 'light');
  }

  closeViewMenu(): void {
    this.viewMenuOpen = false;
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

  private cargarPreferenciaTema(): void {
    this.darkMode = localStorage.getItem(this.themeStorageKey) === 'dark';
  }

  cambiarVista(vista: AppView): void {
    if ((vista === 'dashboard' || vista === 'resumenes') && !this.canViewAnalytics()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'usuarios' && !this.canManageUsers()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'flota' && !this.canManageFlota()) {
      this.closeViewMenu();
      return;
    }
    if ((vista === 'compras-faena' || vista === 'distribuciones') && !this.canManageOperations()) {
      this.closeViewMenu();
      return;
    }
    if (vista === 'recepcion' && !this.canManageRecepcion()) {
      this.closeViewMenu();
      return;
    }
    this.vista = vista;
    this.closeViewMenu();
    if (vista === 'compras-faena' && !this.comprasFaena()) {
      this.cargarComprasFaena();
    }
    if (vista === 'resumenes' && !this.resumenes()) {
      this.cargarResumenes();
    }
    if (vista === 'recepcion' && !this.recepcion()) {
      this.cargarRecepcion();
    }
    if (vista === 'distribuciones' && !this.distribuciones()) {
      this.cargarDistribuciones();
    }
    if (vista === 'usuarios' && !this.adminUsers()) {
      this.cargarUsuarios();
    }
    if (vista === 'flota' && !this.flotaCatalogos()) {
      this.cargarFlota();
    }
  }

  cambiarFlotaSeccion(seccion: FlotaSection): void {
    this.flotaSeccion = seccion;
  }

  shiftFlotaMonth(offset: number): void {
    const current = new Date(this.flotaAnho, this.flotaMes - 1, 1);
    current.setMonth(current.getMonth() + offset);
    this.flotaMes = current.getMonth() + 1;
    this.flotaSemana = this.flotaMes;
    this.flotaAnho = current.getFullYear();
    this.flotaFechaReferencia = this.toIsoDate(current);
    this.cargarFlotaResumen();
  }

  actualizarFlotaMesDesdeFecha(value: string): void {
    this.flotaFechaReferencia = value;
    if (!value) {
      return;
    }
    const selected = new Date(`${value}T00:00:00`);
    if (Number.isNaN(selected.getTime())) {
      return;
    }
    this.flotaMes = selected.getMonth() + 1;
    this.flotaSemana = this.flotaMes;
    this.flotaAnho = selected.getFullYear();
    this.cargarFlotaResumen();
  }

  cargarUsuarios(): void {
    if (!this.canManageUsers()) {
      return;
    }
    this.usuariosLoading.set(true);
    this.usuariosError.set('');
    this.dashboardService.getAdminUsers().subscribe({
      next: (data) => {
        this.adminUsers.set(data);
        if (!data.roles.includes(this.usuarioRol)) {
          this.usuarioRol = data.roles[0] ?? 'recepcion';
        }
        this.ajustarFormularioSucursal();
        this.usuariosLoading.set(false);
      },
      error: (err) => {
        this.usuariosError.set(err?.error?.error ?? 'No se pudo cargar usuarios.');
        this.usuariosLoading.set(false);
      },
    });
  }

  crearUsuario(): void {
    this.usuariosLoading.set(true);
    this.usuariosError.set('');
    this.usuariosOk.set('');
    this.dashboardService.createAdminUser({
      username: this.usuarioUsername,
      nombre: this.usuarioNombre,
      password: this.usuarioPassword,
      rol: this.usuarioRol,
      sucursal_permitida: this.usuarioRol === 'recepcion' ? this.usuarioSucursalPermitida : null,
      activo: this.usuarioActivo,
    }).subscribe({
      next: () => {
        this.usuarioNombre = '';
        this.usuarioUsername = '';
        this.usuarioPassword = '';
        this.usuarioRol = this.adminUsers()?.roles[0] ?? 'recepcion';
        this.usuarioSucursalPermitida = 'luque';
        this.usuarioActivo = true;
        this.usuariosOk.set('Usuario creado.');
        this.cargarUsuarios();
      },
      error: (err) => {
        this.usuariosError.set(err?.error?.error ?? 'No se pudo crear el usuario.');
        this.usuariosLoading.set(false);
      },
    });
  }

  guardarUsuario(user: AdminUser): void {
    this.usuariosLoading.set(true);
    this.usuariosError.set('');
    this.usuariosOk.set('');
    this.dashboardService.updateAdminUser({
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      sucursal_permitida: user.rol === 'recepcion' ? (user.sucursal_permitida ?? 'luque') : null,
      activo: user.activo,
    }).subscribe({
      next: () => {
        this.usuariosOk.set(`Usuario ${user.username} actualizado.`);
        this.cargarUsuarios();
      },
      error: (err) => {
        this.usuariosError.set(err?.error?.error ?? 'No se pudo actualizar el usuario.');
        this.usuariosLoading.set(false);
      },
    });
  }

  iniciarCambioPassword(user: AdminUser): void {
    this.usuarioPasswordEditId = user.id;
    this.usuarioPasswordNueva = '';
    this.usuariosError.set('');
    this.usuariosOk.set('');
  }

  cancelarCambioPassword(): void {
    this.usuarioPasswordEditId = null;
    this.usuarioPasswordNueva = '';
  }

  guardarPasswordUsuario(user: AdminUser): void {
    this.usuariosLoading.set(true);
    this.usuariosError.set('');
    this.usuariosOk.set('');
    this.dashboardService.updateAdminPassword({
      id: user.id,
      password: this.usuarioPasswordNueva,
    }).subscribe({
      next: () => {
        this.usuariosOk.set(`Password actualizada para ${user.username}.`);
        this.usuarioPasswordEditId = null;
        this.usuarioPasswordNueva = '';
        this.cargarUsuarios();
      },
      error: (err) => {
        this.usuariosError.set(err?.error?.error ?? 'No se pudo actualizar la password.');
        this.usuariosLoading.set(false);
      },
    });
  }

  cargarFlota(showLoading = true): void {
    if (!this.canManageFlota()) {
      return;
    }
    if (this.flotaSucursalBloqueada()) {
      this.flotaFiltroSucursal = this.flotaSucursalBloqueada() ?? '';
    }
    if (showLoading) {
      this.flotaLoading.set(true);
    }
    this.flotaError.set('');
    this.dashboardService.getFlotaCatalogos().subscribe({
      next: (catalogos) => {
        this.flotaCatalogos.set(catalogos);
        const vehiculosVisibles = this.flotaVehiculosVisibles();
        if (!vehiculosVisibles.find((item) => item.id === this.combustibleVehiculoId)) {
          this.combustibleVehiculoId = vehiculosVisibles.find((item) => item.activo)?.id ?? vehiculosVisibles[0]?.id ?? null;
        }
        if (!vehiculosVisibles.find((item) => item.id === this.gastoVehiculoId)) {
          this.gastoVehiculoId = vehiculosVisibles.find((item) => item.activo)?.id ?? vehiculosVisibles[0]?.id ?? null;
        }
        if (this.flotaVehiculoId && !vehiculosVisibles.find((item) => item.id === this.flotaVehiculoId)) {
          this.flotaVehiculoId = null;
        }
        if (this.flotaResumenVehiculoId && !vehiculosVisibles.find((item) => item.id === this.flotaResumenVehiculoId)) {
          this.flotaResumenVehiculoId = null;
        }
        if (!this.combustibleProveedorId) {
          this.combustibleProveedorId = this.flotaProveedoresCombustible()[0]?.id ?? null;
        }
        if (!this.gastoTipoId) {
          this.gastoTipoId = this.flotaTiposGastoActivos()[0]?.id ?? null;
        }
        if (!this.gastoProveedorId) {
          this.gastoProveedorId = this.flotaProveedoresActivos()[0]?.id ?? null;
        }
        this.cargarFlotaCombustible(false);
        this.cargarFlotaGastos(false);
        this.cargarFlotaResumen(false);
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo cargar el modulo de flota.');
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
    });
  }

  cargarFlotaCombustible(showLoading = true): void {
    if (!this.canManageFlota()) {
      return;
    }
    if (showLoading) {
      this.flotaLoading.set(true);
    }
    this.dashboardService.getFlotaCombustible({
      desde: this.combustibleDesde || undefined,
      hasta: this.combustibleHasta || undefined,
      vehiculo_id: this.flotaVehiculoId,
      sucursal: this.flotaFiltroSucursal || null,
    }).subscribe({
      next: ({ items }) => {
        this.flotaCombustible.set(items);
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo cargar combustible.');
        if (showLoading) {
          this.flotaLoading.set(false);
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

  cargarFlotaGastos(showLoading = true): void {
    if (!this.canManageFlota()) {
      return;
    }
    if (showLoading) {
      this.flotaLoading.set(true);
    }
    this.dashboardService.getFlotaGastos({
      vehiculo_id: this.flotaGastoVehiculoId,
      tipo_gasto_id: this.flotaTipoGastoFiltroId,
      sucursal: this.flotaFiltroSucursal || null,
    }).subscribe({
      next: ({ items }) => {
        this.flotaGastos.set(items);
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo cargar gastos de flota.');
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
    });
  }

  cargarFlotaResumen(showLoading = true): void {
    if (!this.canManageFlota()) {
      return;
    }
    if (showLoading) {
      this.flotaLoading.set(true);
    }
    this.dashboardService.getFlotaResumenSemanal({
      mes: this.flotaMes,
      anho: this.flotaAnho,
      vehiculo_id: this.flotaResumenVehiculoId,
      sucursal: this.flotaFiltroSucursal || null,
    }).subscribe({
      next: (data) => {
        this.flotaResumen.set(data);
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo cargar el resumen mensual.');
        if (showLoading) {
          this.flotaLoading.set(false);
        }
      },
    });
  }

  descargarFlotaResumenPdf(): void {
    if (!this.canManageFlota()) {
      return;
    }
    const popup = window.open('', '_blank');
    if (!popup) {
      this.flotaError.set('El navegador bloqueo la apertura del PDF. Permiti ventanas emergentes para este sitio.');
      return;
    }
    popup.document.write('<title>Generando PDF...</title><p style="font-family:sans-serif;padding:24px">Generando PDF mensual de flota...</p>');
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.dashboardService.getFlotaResumenMensualPdf({
      mes: this.flotaMes,
      anho: this.flotaAnho,
      vehiculo_id: this.flotaResumenVehiculoId,
      sucursal: this.flotaFiltroSucursal || null,
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        popup.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.flotaLoading.set(false);
      },
      error: async (err) => {
        popup.close();
        this.flotaError.set(await this.extractHttpBlobError(err, 'No se pudo generar el PDF mensual de flota.'));
        this.flotaLoading.set(false);
      },
    });
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
    this.vehiculoSucursal = this.flotaSucursalBloqueada() ?? 'luque';
    this.vehiculoChofer = '';
    this.vehiculoActivo = true;
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
    this.vehiculoSucursal = this.flotaSucursalBloqueada() ?? vehiculo.sucursal ?? 'luque';
    this.vehiculoChofer = vehiculo.chofer ?? '';
    this.vehiculoActivo = vehiculo.activo;
  }

  cancelarEdicionVehiculo(): void {
    this.resetVehiculoForm();
  }

  crearVehiculoFlota(): void {
    const editing = this.vehiculoEditId !== null;
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.dashboardService.saveFlotaVehiculo({
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
        this.flotaOk.set(editing ? 'Vehiculo actualizado.' : 'Vehiculo cargado.');
        this.cargarFlota();
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo guardar el vehiculo.');
        this.flotaLoading.set(false);
      },
    });
  }

  crearProveedorFlota(): void {
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.dashboardService.saveFlotaProveedor({
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
        this.flotaOk.set('Proveedor cargado.');
        this.cargarFlota();
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo guardar el proveedor.');
        this.flotaLoading.set(false);
      },
    });
  }

  crearCargaCombustible(): void {
    if (!this.combustibleVehiculoId) {
      this.flotaError.set('Selecciona un vehiculo para la carga.');
      return;
    }
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.dashboardService.saveFlotaCombustible({
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
        this.combustibleTipo = 'OPTIMO DIESEL';
        this.combustibleLitros = '';
        this.combustibleImporte = '';
        this.combustibleFactura = '';
        this.combustibleObservacion = '';
        this.flotaOk.set('Carga de combustible registrada.');
        this.cargarFlota();
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo registrar la carga.');
        this.flotaLoading.set(false);
      },
    });
  }

  eliminarCargaCombustible(row: FlotaCombustibleRow): void {
    const vehiculo = this.vehiculoMovLabel(row);
    const motivo = window.prompt(`Motivo de eliminacion para la carga de ${vehiculo} del ${row.fecha}:`, '');
    if (motivo === null) {
      return;
    }
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      this.flotaError.set('Debes indicar el motivo de eliminacion.');
      return;
    }
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.dashboardService.deleteFlotaCombustible({ id: row.id, motivo: motivoLimpio }).subscribe({
      next: () => {
        this.flotaOk.set('Carga de combustible eliminada.');
        this.cargarFlota();
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo eliminar la carga.');
        this.flotaLoading.set(false);
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

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  private async extractHttpBlobError(err: unknown, fallback: string): Promise<string> {
    const blob = (err as { error?: unknown } | null)?.error;
    if (!(blob instanceof Blob)) {
      return (err as { error?: { error?: string } } | null)?.error?.error ?? fallback;
    }
    try {
      const text = await blob.text();
      if (!text) {
        return fallback;
      }
      const parsed = JSON.parse(text) as { error?: string };
      return parsed?.error || fallback;
    } catch {
      return fallback;
    }
  }

  importarCombustibleArchivo(): void {
    if (!this.combustibleImportFile) {
      this.flotaError.set('Selecciona un archivo CSV o XLSX.');
      return;
    }
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.readFileAsDataUrl(this.combustibleImportFile)
      .then((fileContent) => {
        this.dashboardService.importFlotaCombustible({
          file_name: this.combustibleImportFile?.name ?? 'combustible.xlsx',
          file_content: fileContent,
          proveedor_id: this.combustibleImportProveedorId,
        }).subscribe({
          next: (result) => {
            this.combustibleImportFile = null;
            this.combustibleImportFileName = '';
            this.flotaOk.set(
              `Importacion completada. ${result.inserted} filas cargadas, ${result.skipped} omitidas.${result.errors.length ? ` ${result.errors.length} con error.` : ''}`,
            );
            if (result.errors.length) {
              const topErrors = result.errors.slice(0, 5).map((item) => `Fila ${item.row}: ${item.error}`).join(' | ');
              this.flotaError.set(topErrors);
            }
            this.cargarFlota();
          },
          error: (err) => {
            this.flotaError.set(err?.error?.error ?? 'No se pudo importar el archivo.');
            this.flotaLoading.set(false);
          },
        });
      })
      .catch((err) => {
        this.flotaError.set(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
        this.flotaLoading.set(false);
      });
  }

  previsualizarCombustibleArchivo(): void {
    if (!this.combustibleImportFile) {
      this.flotaError.set('Selecciona un archivo CSV o XLSX.');
      return;
    }
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.readFileAsDataUrl(this.combustibleImportFile)
      .then((fileContent) => {
        this.dashboardService.previewFlotaCombustibleImport({
          file_name: this.combustibleImportFile?.name ?? 'combustible.xlsx',
          file_content: fileContent,
        }).subscribe({
          next: (result) => {
            this.flotaCombustibleImportPreview.set(result.items);
            this.flotaCombustibleImportPreviewSummary.set(result);
            this.flotaOk.set(`Vista previa lista. ${result.ok_count} filas validas, ${result.error_count} con error, ${result.skipped} omitidas.`);
            if (result.error_count) {
              const topErrors = result.items
                .filter((item) => item.status === 'error')
                .slice(0, 5)
                .map((item) => `Fila ${item.row}: ${item.error}`)
                .join(' | ');
              this.flotaError.set(topErrors);
            }
            this.flotaLoading.set(false);
          },
          error: (err) => {
            this.flotaError.set(err?.error?.error ?? 'No se pudo generar la vista previa.');
            this.flotaLoading.set(false);
          },
        });
      })
      .catch((err) => {
        this.flotaError.set(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
        this.flotaLoading.set(false);
      });
  }

  crearGastoFlota(): void {
    if (!this.gastoVehiculoId || !this.gastoTipoId) {
      this.flotaError.set('Completa vehiculo y tipo de gasto.');
      return;
    }
    this.flotaLoading.set(true);
    this.flotaError.set('');
    this.flotaOk.set('');
    this.dashboardService.saveFlotaGasto({
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
        this.gastoProveedorNombre = '';
        this.gastoProveedorRuc = '';
        this.gastoImporte = '';
        this.gastoKmActual = '';
        this.gastoFactura = '';
        this.gastoDetalle = '';
        this.flotaOk.set('Gasto registrado.');
        this.cargarFlota();
      },
      error: (err) => {
        this.flotaError.set(err?.error?.error ?? 'No se pudo registrar el gasto.');
        this.flotaLoading.set(false);
      },
    });
  }

  vehiculoSucursalLabel(slug?: string | null): string {
    if (!slug) {
      return '-';
    }
    return this.flotaCatalogos()?.sucursales.find((item) => item.slug === slug)?.nombre ?? slug;
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

  vehiculosFlotaPorSucursal(sucursal?: string | null) {
    const slug = String(sucursal ?? '').trim().toLowerCase();
    return this.flotaVehiculosVisibles().filter((vehiculo) => String(vehiculo.sucursal ?? '').trim().toLowerCase() === slug);
  }

  vehiculosFlotaSinSucursal() {
    return this.flotaVehiculosVisibles().filter((vehiculo) => !String(vehiculo.sucursal ?? '').trim());
  }

  flotaMonthTitle(): string {
    return new Intl.DateTimeFormat('es-PY', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(this.flotaAnho, this.flotaMes - 1, 1));
  }

  flotaMonthSubtitle(): string {
    const start = new Date(this.flotaAnho, this.flotaMes - 1, 1);
    const end = new Date(this.flotaAnho, this.flotaMes, 0);
    const startLabel = new Intl.DateTimeFormat('es-PY', {
      day: 'numeric',
      month: 'long',
    }).format(start);
    const endLabel = new Intl.DateTimeFormat('es-PY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(end);
    return `Del ${startLabel} al ${endLabel}`;
  }

  flotaMonthRowLabel(month: number, year: number): string {
    return new Intl.DateTimeFormat('es-PY', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));
  }

  flotaWeekRangeLabel(week: number, year: number): string {
    return this.flotaMonthRowLabel(week, year);
  }

  flotaWeekTitle(): string {
    return `Semana ${this.flotaSemana} · ${this.flotaWeekRangeLabel(this.flotaSemana, this.flotaAnho)}`;
  }

  flotaWeekSubtitle(): string {
    const start = this.getIsoWeekStartDate(this.flotaSemana, this.flotaAnho);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startLabel = new Intl.DateTimeFormat('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(start);
    const endLabel = new Intl.DateTimeFormat('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(end);
    return `Del ${startLabel} al ${endLabel}`;
  }

  flotaWeekRowLabel(week: number, year: number): string {
    return `Sem ${week} · ${this.flotaWeekRangeLabel(week, year)}`;
  }

  gastoTipoSeleccionado(): FlotaTipoGasto | null {
    return this.flotaTiposGastoActivos().find((item) => item.id === this.gastoTipoId) ?? null;
  }

  proveedorLabel(proveedor?: FlotaProveedor | null): string {
    return proveedor ? `${proveedor.nombre} (${proveedor.tipo})` : '-';
  }

  cargarResumenes(showLoading = true): void {
    if (showLoading) {
      this.resumenLoading.set(true);
    }
    this.error.set('');
    this.dashboardService.getResumenes(Array.from(this.resumenSeleccionados)).subscribe({
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
    this.dashboardService.getResumenesPdf(loteIds).subscribe({
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
    this.dashboardService.marcarResumenesCerrados(loteIds).subscribe({
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
    this.dashboardService.marcarResumenesCerrados([lote.id], !lote.cerrado).subscribe({
      next: () => {
        this.cargarResumenes(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo actualizar el estado del lote.');
        this.resumenLoading.set(false);
      },
    });
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

  cargarComprasFaena(loteId?: number | null): void {
    this.compraLoading.set(true);
    this.error.set('');
    this.dashboardService.getComprasFaena(loteId ?? this.compraLoteId).subscribe({
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

  guardarCompraLote(): void {
    this.compraLoading.set(true);
    this.error.set('');
    this.dashboardService.saveCompraLote({
      id: null,
      lote: this.compraLote,
      empresa: this.compraEmpresa,
      fecha: this.compraFecha,
      cantidad: this.compraCantidad,
      monto: this.compraMonto,
      peso_compra_kg: this.compraPesoKg,
    }).subscribe({
      next: () => {
        this.limpiarCompraForm();
        this.cargarComprasFaena();
        this.cargar();
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
    this.compraLoading.set(true);
    this.error.set('');
    this.dashboardService.saveCompraLote({
      id: lote.id,
      lote: this.modalCompraLote,
      empresa: this.modalCompraEmpresa,
      fecha: this.modalCompraFecha,
      cantidad: this.modalCompraCantidad,
      monto: this.modalCompraMonto,
      peso_compra_kg: this.modalCompraPesoKg,
    }).subscribe({
      next: () => {
        this.compraEditModalOpen = false;
        this.cargarComprasFaena(lote.id);
        this.cargar();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo actualizar el lote.');
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
    this.dashboardService.addFaena({
      lote_id: lote.id,
      fecha: this.faenaFecha,
      cantidad: this.faenaCantidad,
      nota: this.faenaNota,
    }).subscribe({
      next: () => {
        this.faenaModalOpen = false;
        this.cargarComprasFaena(lote.id);
        this.cargarDistribuciones(lote.id);
        this.cargar();
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
    this.dashboardService.setFaenaTotal({
      lote_id: lote.id,
      fecha: this.faenaAjusteFecha,
      cantidad_total: this.faenaAjusteCantidad,
      nota: this.faenaAjusteNota,
    }).subscribe({
      next: () => {
        this.cargarComprasFaena(lote.id);
        this.cargarDistribuciones(lote.id);
        this.cargar();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo corregir la faena del lote.');
        this.compraLoading.set(false);
      },
    });
  }

  cargarDistribuciones(loteId?: number | null, showLoading = true): void {
    if (showLoading) {
      this.distribucionLoading.set(true);
      this.distribucionError.set('');
      this.distribucionOk.set('');
    }
    this.dashboardService.getDistribuciones(loteId ?? this.distribucionLoteId).subscribe({
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
    this.dashboardService
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
    this.dashboardService
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
          this.cargar();
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
    this.dashboardService
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
          this.cargar();
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
    this.dashboardService.deleteDistribucion(row.id).subscribe({
      next: () => {
        this.distribucionOk.set('Distribucion eliminada.');
        this.cargarDistribuciones(this.distribucionLoteId);
        this.cargar();
      },
      error: (err) => {
        this.distribucionError.set(err?.error?.error ?? 'No se pudo eliminar la distribucion.');
        this.distribucionLoading.set(false);
      },
    });
  }

  cargarRecepcion(): void {
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.dashboardService.getRecepcion(this.recepcionSucursal, this.recepcionFecha).subscribe({
      next: (data) => {
        this.recepcion.set(data);
        this.recepcionLoading.set(false);
        if (this.seleccionadoId) {
          const selected = data.distribuciones.find((row) => row.id === this.seleccionadoId);
          if (selected) {
            this.seleccionarDistribucion(selected);
          }
        }
      },
      error: (err) => {
        this.recepcionError.set(err?.error?.error ?? 'No se pudo cargar la recepcion.');
        this.recepcionLoading.set(false);
      },
    });
  }

  abrirReporteRecepcionPdf(): void {
    const rec = this.recepcion();
    if (!rec) {
      this.recepcionError.set('No hay datos de recepcion para generar el reporte.');
      return;
    }
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.dashboardService.getRecepcionPdf(this.recepcionSucursal, this.recepcionFecha).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank');
        if (!opened) {
          this.recepcionError.set('El navegador bloqueo la apertura del PDF. Permiti ventanas emergentes para este sitio.');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.recepcionLoading.set(false);
      },
      error: async (err) => {
        this.recepcionError.set(await this.extractHttpBlobError(err, 'No se pudo generar el PDF de recepcion.'));
        this.recepcionLoading.set(false);
      },
    });
  }

  cambiarSucursalRecepcion(): void {
    if (this.recepcionSucursalBloqueada()) {
      this.syncRecepcionScopeFromUser();
      return;
    }
    this.seleccionadoId = null;
    this.recepcionKg = '';
    this.recepcionFaltante = '';
    this.recepcionSobrante = '';
    this.recepcionNota = '';
    this.recepcionBusqueda = '';
    this.menuBusqueda = '';
    this.cargarRecepcion();
  }

  onUsuarioRolChange(): void {
    this.ajustarFormularioSucursal();
  }

  private ajustarFormularioSucursal(): void {
    if (this.usuarioRol !== 'recepcion') {
      this.usuarioSucursalPermitida = 'luque';
    }
  }

  seleccionarDistribucion(row: RecepcionDistribucion): void {
    this.seleccionadoId = row.id;
    this.recepcionKg = String(Number(row.kg || 0).toFixed(2));
    this.recepcionFaltante = Number(row.diferencia_kg) < 0 ? String(Math.abs(Number(row.diferencia_kg)).toFixed(2)) : '';
    this.recepcionSobrante = Number(row.diferencia_kg) > 0 ? String(Number(row.diferencia_kg).toFixed(2)) : '';
    this.recepcionNota = row.nota ?? '';
    this.focusRecepcionKgInput();
  }

  private focusRecepcionKgInput(): void {
    setTimeout(() => {
      const input = this.recepcionKgInput?.nativeElement;
      if (!input) {
        return;
      }
      input.focus();
      input.select();
    });
  }

  guardarRecepcionKg(): void {
    if (!this.seleccionadoId) {
      this.recepcionError.set('Elegi una distribucion de la lista.');
      return;
    }
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.dashboardService
      .updateRecepcionDistribucion(this.recepcionSucursal, {
        id: this.seleccionadoId,
        kg: this.recepcionKg,
        faltante_kg: this.recepcionFaltante,
        sobrante_kg: this.recepcionSobrante,
        registrado_por: this.recepcionRegistradoPor,
        nota: this.recepcionNota,
      })
      .subscribe({
        next: () => {
          this.recepcionOk.set('Kg recibido actualizado.');
          this.cargarRecepcion();
          this.cargar();
        },
        error: (err) => {
          this.recepcionError.set(err?.error?.error ?? 'No se pudo actualizar el kg.');
          this.recepcionLoading.set(false);
        },
      });
  }

  agregarMenudencia(): void {
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.dashboardService
      .addMenudencia(this.recepcionSucursal, {
        fecha: this.recepcionFecha,
        producto: this.nuevoProducto,
        kg: this.nuevoKg,
        unidades: this.nuevoUnidades,
      })
      .subscribe({
        next: () => {
          this.nuevoProducto = '';
          this.nuevoKg = '';
          this.nuevoUnidades = '';
          this.recepcionOk.set('Menudencia agregada.');
          this.cargarRecepcion();
          this.cargar();
        },
        error: (err) => {
          this.recepcionError.set(err?.error?.error ?? 'No se pudo guardar la menudencia.');
          this.recepcionLoading.set(false);
        },
      });
  }

  actualizarMenudencia(row: RecepcionMenudencia): void {
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.dashboardService.updateMenudencia(this.recepcionSucursal, row).subscribe({
      next: () => {
        this.recepcionOk.set('Menudencia actualizada.');
        this.cargarRecepcion();
        this.cargar();
      },
      error: (err) => {
        this.recepcionError.set(err?.error?.error ?? 'No se pudo actualizar la menudencia.');
        this.recepcionLoading.set(false);
      },
    });
  }

  guardarTodasMenudencias(): void {
    const rows = this.recepcion()?.menudencias ?? [];
    if (rows.length === 0) {
      return;
    }
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    forkJoin(rows.map((row) => this.dashboardService.updateMenudencia(this.recepcionSucursal, row))).subscribe({
      next: () => {
        this.recepcionOk.set('Todas las menudencias guardadas.');
        this.cargarRecepcion();
        this.cargar();
      },
      error: (err) => {
        this.recepcionError.set(err?.error?.error ?? 'No se pudieron guardar todas las menudencias.');
        this.recepcionLoading.set(false);
      },
    });
  }

  eliminarMenudencia(row: RecepcionMenudencia): void {
    const ok = window.confirm(`Eliminar ${row.producto}?`);
    if (!ok) {
      return;
    }
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.dashboardService.deleteMenudencia(this.recepcionSucursal, row.id).subscribe({
      next: () => {
        this.recepcionOk.set('Menudencia eliminada.');
        this.cargarRecepcion();
        this.cargar();
      },
      error: (err) => {
        this.recepcionError.set(err?.error?.error ?? 'No se pudo eliminar la menudencia.');
        this.recepcionLoading.set(false);
      },
    });
  }

  barWidth(row: DistribucionLocal | MenudenciaSucursal | TopMenudencia, maxValue: number): string {
    const kg = Number(row.kg) || 0;
    return `${Math.max((kg / maxValue) * 100, 3)}%`;
  }

  barWidthValue(value: number, maxValue: number): string {
    const amount = Number(value) || 0;
    return `${Math.max((amount / maxValue) * 100, 3)}%`;
  }

  combustiblePrecioLitro(): number {
    const litros = Number(this.combustibleLitros) || 0;
    const importe = Number(this.combustibleImporte) || 0;
    if (!litros || !importe) {
      return 0;
    }
    return importe / litros;
  }

  fmtNumber(value: number, decimals = 0): string {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(value) || 0);
  }

  fmtMoney(value: number): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  fmtFlotaMoney(value: number): string {
    return `Gs. ${new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0)}`;
  }

  private buildRecepcionReportHtml(rec: RecepcionData): string {
    const user = this.currentUser();
    const distribuciones = rec.distribuciones ?? [];
    const menudencias = rec.menudencias ?? [];
    const totalKgDistribuido = distribuciones.reduce((acc, row) => acc + (Number(row.kg) || 0), 0);
    const totalCabezas = distribuciones.reduce((acc, row) => acc + (Number(row.cabezas) || 0), 0);
    const totalDifKg = distribuciones.reduce((acc, row) => acc + (Number(row.diferencia_kg) || 0), 0);
    const totalKgMenudencias = menudencias.reduce((acc, row) => acc + (Number(row.kg) || 0), 0);
    const totalUnidadesMenudencias = menudencias.reduce((acc, row) => acc + (Number(row.unidades) || 0), 0);
    const generadoEn = new Intl.DateTimeFormat('es-PY', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const distribucionesRows = distribuciones.length
      ? distribuciones.map((row) => `
          <tr>
            <td>${this.escapeHtml(row.fecha)}</td>
            <td>${this.escapeHtml(row.lote)}</td>
            <td>${this.escapeHtml(row.origen)}</td>
            <td class="num">${this.fmtNumber(row.kg, 2)}</td>
            <td class="num">${this.fmtNumber(row.cabezas)}</td>
            <td class="num">${this.fmtNumber(row.diferencia_kg, 2)}</td>
            <td>${this.escapeHtml(row.nota || '-')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="7" class="empty">Sin distribuciones para el filtro actual.</td></tr>';

    const menudenciasRows = menudencias.length
      ? menudencias.map((row) => `
          <tr>
            <td>${this.escapeHtml(row.producto)}</td>
            <td class="num">${this.fmtNumber(row.kg, 2)}</td>
            <td class="num">${this.fmtNumber(row.unidades)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="3" class="empty">Sin menudencias cargadas para la fecha seleccionada.</td></tr>';

    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Reporte recepcion ${this.escapeHtml(rec.sucursal)} ${this.escapeHtml(rec.fecha)}</title>
    <style>
      :root {
        --bg: #f4f7fb;
        --panel: #ffffff;
        --ink: #183046;
        --muted: #5e7589;
        --line: #d7e2ea;
        --brand: #0f5960;
        --brand-soft: #e8f4f4;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, sans-serif;
        color: var(--ink);
        background: var(--bg);
      }
      .page {
        max-width: 1120px;
        margin: 0 auto;
        padding: 28px;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-bottom: 16px;
      }
      .actions button {
        border: 0;
        border-radius: 10px;
        padding: 10px 16px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .actions .primary {
        color: #fff;
        background: var(--brand);
      }
      .actions .secondary {
        color: var(--ink);
        background: #e6eef5;
      }
      .hero {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 16px;
        margin-bottom: 18px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 20px 22px;
      }
      h1, h2, h3, p { margin: 0; }
      .eyebrow {
        color: var(--brand);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 10px;
      }
      .hero h1 {
        font-size: 30px;
        line-height: 1.05;
        margin-bottom: 8px;
      }
      .hero .meta {
        display: grid;
        gap: 8px;
        color: var(--muted);
      }
      .hero .meta strong {
        color: var(--ink);
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }
      .metric {
        background: #183845;
        color: #fff;
        border-radius: 16px;
        padding: 16px 18px;
      }
      .metric span {
        display: block;
        font-size: 12px;
        opacity: 0.82;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 8px;
      }
      .metric strong {
        font-size: 28px;
        line-height: 1.05;
      }
      .metric small {
        display: block;
        margin-top: 8px;
        font-size: 12px;
        opacity: 0.86;
      }
      .section {
        margin-bottom: 18px;
      }
      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 10px;
      }
      .section-head h2 {
        font-size: 20px;
      }
      .section-head span {
        color: var(--muted);
        font-size: 13px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
      }
      thead th {
        padding: 12px 14px;
        background: #eef4f8;
        color: #35526b;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        text-align: left;
      }
      tbody td {
        padding: 11px 14px;
        border-top: 1px solid #ebf1f5;
        vertical-align: top;
        font-size: 13px;
      }
      td.num {
        text-align: right;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      td.empty {
        text-align: center;
        color: var(--muted);
        padding: 20px;
      }
      .footer {
        color: var(--muted);
        font-size: 12px;
        text-align: right;
        margin-top: 8px;
      }
      @media print {
        body { background: #fff; }
        .page { max-width: none; padding: 0; }
        .actions { display: none; }
        .card, table { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="actions">
        <button class="secondary" onclick="window.close()">Cerrar</button>
        <button class="primary" onclick="window.print()">Imprimir / Guardar PDF</button>
      </div>

      <section class="hero">
        <article class="card">
          <div class="eyebrow">Reporte por sucursal</div>
          <h1>Recepcion ${this.escapeHtml(rec.sucursal)}</h1>
          <div class="meta">
            <div><strong>Fecha de menudencias:</strong> ${this.escapeHtml(this.formatHumanDate(rec.fecha))}</div>
            <div><strong>Sucursal operativa:</strong> ${this.escapeHtml(rec.local || rec.sucursal)}</div>
            <div><strong>Generado por:</strong> ${this.escapeHtml(user?.nombre || user?.username || 'Sistema')}</div>
          </div>
        </article>
        <article class="card">
          <div class="eyebrow">Contexto</div>
          <div class="meta">
            <div><strong>Rol:</strong> ${this.escapeHtml(user?.rol || '-')}</div>
            <div><strong>Sucursal habilitada:</strong> ${this.escapeHtml(user?.sucursal_permitida || 'todas')}</div>
            <div><strong>Generado en:</strong> ${this.escapeHtml(generadoEn)}</div>
          </div>
        </article>
      </section>

      <section class="metrics">
        <article class="metric">
          <span>Distribuciones</span>
          <strong>${this.fmtNumber(distribuciones.length)}</strong>
          <small>Movimientos del reporte</small>
        </article>
        <article class="metric">
          <span>Kg distribuidos</span>
          <strong>${this.fmtNumber(totalKgDistribuido, 2)}</strong>
          <small>Total recepcionado en sucursal</small>
        </article>
        <article class="metric">
          <span>Reces</span>
          <strong>${this.fmtNumber(totalCabezas)}</strong>
          <small>Cabezas asociadas</small>
        </article>
        <article class="metric">
          <span>Menudencias</span>
          <strong>${this.fmtNumber(totalKgMenudencias, 2)}</strong>
          <small>${this.fmtNumber(totalUnidadesMenudencias)} unidades</small>
        </article>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Distribuciones</h2>
          <span>Diferencia acumulada: ${this.fmtNumber(totalDifKg, 2)} kg</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Lote</th>
              <th>Origen</th>
              <th>Kg</th>
              <th>Reces</th>
              <th>Dif. kg</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>${distribucionesRows}</tbody>
        </table>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Menudencias</h2>
          <span>${this.escapeHtml(this.formatHumanDate(rec.fecha))}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Kg</th>
              <th>Unidades</th>
            </tr>
          </thead>
          <tbody>${menudenciasRows}</tbody>
        </table>
      </section>

      <div class="footer">Reporte generado desde el dashboard web.</div>
    </div>
  </body>
</html>`;
  }

  private formatHumanDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  progressWidth(value: number): string {
    const pct = Math.max(Math.min(Number(value) || 0, 100), 0);
    return `${pct}%`;
  }

  private loteMatches(lote: LoteResumen, term: string): boolean {
    return [lote.fecha, lote.lote, lote.empresa].some((value) =>
      String(value ?? '').toLowerCase().includes(term),
    );
  }
}
