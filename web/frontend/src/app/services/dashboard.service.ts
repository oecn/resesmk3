import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ResumenKpis {
  reses_camara: number;
  reses_sin_faenar: number;
  lotes_pendientes: number;
  lotes: number;
  reces_compradas: number;
  reces_faenadas: number;
  reces_distribuidas: number;
  kg_distribuidos: number;
  kg_compra: number;
  monto_total: number;
  costo_kg_promedio: number;
  pct_distribuido: number;
  rendimiento_pct: number;
}

export interface CompraEmpresa {
  empresa: string;
  reces: number;
  kg_compra: number;
  monto: number;
}

export interface DistribucionLocal {
  local: string;
  reces: number;
  kg: number;
}

export interface MenudenciaSucursal {
  sucursal: string;
  kg: number;
  unidades: number;
}

export interface TopMenudencia {
  producto: string;
  kg: number;
  unidades: number;
  kg_por_unidad: number;
}

export interface MenudenciaProductoSucursal {
  producto: string;
  kg_total: number;
  unidades_total: number;
  aregua_kg: number;
  aregua_unidades: number;
  luque_kg: number;
  luque_unidades: number;
  itaugua_kg: number;
  itaugua_unidades: number;
}

export interface RecepcionDistribucion {
  id: number;
  lote_id: number;
  lote: string;
  origen: string;
  fecha: string;
  kg: number;
  cabezas: number;
  nota: string;
  local: string;
  diferencia_kg: number;
}

export interface RecepcionMenudencia {
  id: number;
  fecha: string;
  producto: string;
  kg: number;
  unidades: number;
}

export type RecepcionSucursalSlug = 'aregua' | 'luque' | 'itaugua';

export interface RecepcionData {
  fecha: string;
  sucursal: string;
  local: string;
  distribuciones: RecepcionDistribucion[];
  menudencias: RecepcionMenudencia[];
}

export interface DistribucionLote {
  id: number;
  lote: string;
  empresa: string;
  fecha: string;
  faenado: number;
  distribuidas: number;
  has_zero_kg: boolean;
}

export interface DistribucionRow {
  id: number;
  lote_id?: number;
  fecha: string;
  local: string;
  kg: number;
  nota: string;
  cabezas: number;
  diferencia_kg: number;
}

export interface DistribucionResumenLocal {
  local: string;
  kg: number;
  cabezas: number;
}

export interface DistribucionesData {
  lotes: DistribucionLote[];
  selected_lote_id: number | null;
  distribuciones: DistribucionRow[];
  resumenLocal: DistribucionResumenLocal[];
}

export interface CompraFaenaLote {
  id: number;
  lote: string;
  empresa: string;
  fecha: string;
  cantidad: number;
  faenado: number;
  restante: number;
  distribuidas: number;
  monto: number;
  peso_compra_kg: number;
}

export interface CompraFaenaResumen {
  lotes_registrados: number;
  reses_camara: number;
  reses_sin_faenar: number;
  lotes_pendientes: number;
}

export interface CompraFaenaRow {
  id: number;
  lote_id: number;
  fecha: string;
  cantidad: number;
  nota: string;
}

export interface ComprasFaenaData {
  empresas: string[];
  resumen: CompraFaenaResumen;
  lotes: CompraFaenaLote[];
  pendientes: CompraFaenaLote[];
  completados: CompraFaenaLote[];
  selected_lote_id: number | null;
  faenas: CompraFaenaRow[];
}

export interface LoteResumen {
  id: number;
  lote: string;
  empresa: string;
  fecha: string;
  cerrado: boolean;
  cantcompra: number;
  faenado: number;
  distribuido: number;
  kg: number;
  kgcompra: number;
  monto: number;
  costokg: number;
  pct_distribuido: number;
  pct_restante: number;
  rend_pct: number;
}

export interface DashboardData {
  resumen: ResumenKpis;
  comprasPorEmpresa: CompraEmpresa[];
  distribucionesPorLocal: DistribucionLocal[];
  menudenciasPorSucursal: MenudenciaSucursal[];
  topMenudencias: TopMenudencia[];
  menudenciasPorProductoSucursal: MenudenciaProductoSucursal[];
  lotes: LoteResumen[];
}

export interface ResumenSucursalSeleccionada {
  local: string;
  kg: number;
  cabezas: number;
  dif_kg: number;
}

export interface ResumenesData {
  empresas: string[];
  lotes: LoteResumen[];
  selected_lote_ids: number[];
  resumenSucursales: ResumenSucursalSeleccionada[];
}

export interface CurrentUser {
  id: number;
  username: string;
  nombre: string;
  rol: 'admin' | 'supervisor' | 'recepcion';
  activo: boolean;
  ultimo_login?: string | null;
  sucursal_permitida?: 'aregua' | 'luque' | 'itaugua' | null;
}

export interface AdminUser {
  id: number;
  username: string;
  nombre: string;
  rol: 'admin' | 'supervisor' | 'recepcion';
  activo: boolean;
  ultimo_login?: string | null;
  creado_en?: string | null;
  sucursal_permitida?: 'aregua' | 'luque' | 'itaugua' | null;
}

export interface AdminUsersData {
  roles: Array<'admin' | 'supervisor' | 'recepcion' | string>;
  users: AdminUser[];
}

export interface FlotaSucursal {
  slug: RecepcionSucursalSlug;
  nombre: string;
  local: string;
}

export interface FlotaVehiculo {
  id: number;
  codigo?: string | null;
  chapa?: string | null;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  anho?: number | null;
  tipo?: string | null;
  sucursal?: RecepcionSucursalSlug | null;
  chofer?: string | null;
  activo: boolean;
  creado_en?: string | null;
}

export interface FlotaProveedor {
  id: number;
  nombre: string;
  tipo: 'combustible' | 'taller' | 'otros';
  ruc?: string | null;
  telefono?: string | null;
  activo: boolean;
}

export interface FlotaTipoGasto {
  id: number;
  nombre: string;
  requiere_km: boolean;
  activo: boolean;
}

export interface FlotaCatalogosData {
  vehiculos: FlotaVehiculo[];
  proveedores: FlotaProveedor[];
  tiposGasto: FlotaTipoGasto[];
  sucursales: FlotaSucursal[];
}

export interface FlotaCombustibleRow {
  id: number;
  fecha: string;
  vehiculo_id: number;
  vehiculo_codigo?: string | null;
  vehiculo_nombre: string;
  chapa?: string | null;
  sucursal?: string | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string;
  litros: number;
  importe: number;
  precio_litro: number;
  tipo_combustible?: string | null;
  km_actual?: number | null;
  nro_factura?: string;
  observacion?: string;
  semana: number;
  anho: number;
  cargado_por?: string | null;
  creado_en?: string | null;
  eliminado_en?: string | null;
  eliminado_por?: string | null;
  motivo_eliminacion?: string | null;
}

export interface FlotaCombustibleImportResult {
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  missing_vehicles?: Array<{ vehiculo: string; count: number }>;
}

export interface FlotaCombustibleImportPreviewRow {
  row: number;
  vehiculo_ref: string;
  vehiculo_match: string;
  fecha: string;
  tipo_combustible: string;
  litros: number;
  precio_litro: number;
  importe: number;
  nro_factura: string;
  status: 'ok' | 'error';
  error?: string;
}

export interface FlotaCombustibleImportPreviewResult {
  items: FlotaCombustibleImportPreviewRow[];
  skipped: number;
  ok_count: number;
  error_count: number;
}

export interface FlotaGastoRow {
  id: number;
  fecha: string;
  vehiculo_id: number;
  vehiculo_codigo?: string | null;
  vehiculo_nombre: string;
  chapa?: string | null;
  sucursal?: string | null;
  tipo_gasto_id: number;
  tipo_gasto: string;
  requiere_km?: boolean;
  proveedor_id?: number | null;
  proveedor_nombre?: string;
  proveedor_ruc?: string;
  importe: number;
  km_actual?: number | null;
  nro_factura?: string;
  detalle?: string;
  semana: number;
  anho: number;
  cargado_por?: string | null;
  creado_en?: string | null;
  eliminado_en?: string | null;
  eliminado_por?: string | null;
  motivo_eliminacion?: string | null;
}

export interface FlotaResumenRow {
  vehiculo_id: number;
  codigo?: string | null;
  nombre: string;
  chapa?: string | null;
  sucursal?: string | null;
  tipo?: string | null;
  mes: number;
  anho: number;
  litros: number;
  combustible_total: number;
  otros_gastos: number;
  total_general: number;
  precio_litro_promedio: number;
  km_min?: number | null;
  km_actual?: number | null;
  km_recorrido?: number;
  costo_por_km?: number | null;
}

export interface FlotaResumenSucursalRow {
  sucursal: string;
  vehiculos: number;
  litros: number;
  combustible_total: number;
  otros_gastos: number;
  total_general: number;
}

export interface FlotaComparativoSemanaRow {
  mes: number;
  anho: number;
  vehiculos: number;
  combustible_total: number;
  otros_gastos: number;
  total_general: number;
}

export interface FlotaRankingCostoRow {
  vehiculo_id: number;
  codigo?: string | null;
  nombre: string;
  sucursal?: string | null;
  tipo?: string | null;
  total_general: number;
  costo_por_km?: number | null;
}

export interface FlotaResumenSemanalData {
  totales: {
    mes: number;
    anho: number;
    vehiculos: number;
    litros: number;
    combustible_total: number;
    otros_gastos: number;
    total_general: number;
  };
  items: FlotaResumenRow[];
  totalesPorSucursal: FlotaResumenSucursalRow[];
  comparativoMeses: FlotaComparativoSemanaRow[];
  rankingCosto: FlotaRankingCostoRow[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly http: HttpClient) {}

  login(payload: { username: string; password: string }): Observable<{ ok: boolean; user: CurrentUser }> {
    return this.http.post<{ ok: boolean; user: CurrentUser }>(`${environment.apiUrl}/auth/login`, payload, {
      withCredentials: true,
    });
  }

  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true });
  }

  getCurrentUser(): Observable<{ user: CurrentUser }> {
    return this.http.get<{ user: CurrentUser }>(`${environment.apiUrl}/auth/me`, { withCredentials: true });
  }

  getAdminUsers(): Observable<AdminUsersData> {
    return this.http.get<AdminUsersData>(`${environment.apiUrl}/auth/users`, { withCredentials: true });
  }

  getFlotaCatalogos(): Observable<FlotaCatalogosData> {
    return this.http.get<FlotaCatalogosData>(`${environment.apiUrl}/flota/catalogos`, { withCredentials: true });
  }

  saveFlotaVehiculo(payload: {
    id?: number | null;
    codigo?: string | null;
    chapa?: string | null;
    nombre: string;
    marca?: string;
    modelo?: string;
    anho?: number | string | null;
    tipo?: string;
    sucursal?: string | null;
    chofer?: string;
    activo?: boolean;
  }): Observable<FlotaVehiculo> {
    return this.http.post<FlotaVehiculo>(`${environment.apiUrl}/flota/vehiculos`, payload, { withCredentials: true });
  }

  saveFlotaProveedor(payload: {
    id?: number | null;
    nombre: string;
    tipo: string;
    ruc?: string;
    telefono?: string;
    activo?: boolean;
  }): Observable<FlotaProveedor> {
    return this.http.post<FlotaProveedor>(`${environment.apiUrl}/flota/proveedores`, payload, { withCredentials: true });
  }

  getFlotaCombustible(filters: {
    desde?: string;
    hasta?: string;
    vehiculo_id?: number | null;
    sucursal?: string | null;
  } = {}): Observable<{ items: FlotaCombustibleRow[] }> {
    let params = new HttpParams();
    if (filters.desde) {
      params = params.set('desde', filters.desde);
    }
    if (filters.hasta) {
      params = params.set('hasta', filters.hasta);
    }
    if (filters.vehiculo_id) {
      params = params.set('vehiculo_id', filters.vehiculo_id);
    }
    if (filters.sucursal) {
      params = params.set('sucursal', filters.sucursal);
    }
    return this.http.get<{ items: FlotaCombustibleRow[] }>(`${environment.apiUrl}/flota/combustible`, { params, withCredentials: true });
  }

  saveFlotaCombustible(payload: {
    fecha: string;
    vehiculo_id: number;
    proveedor_id?: number | null;
    litros: number | string;
    importe: number | string;
    tipo_combustible?: string;
    km_actual?: number | string | null;
    nro_factura?: string;
    observacion?: string;
  }): Observable<FlotaCombustibleRow> {
    return this.http.post<FlotaCombustibleRow>(`${environment.apiUrl}/flota/combustible`, payload, { withCredentials: true });
  }

  deleteFlotaCombustible(payload: { id: number; motivo: string }): Observable<{ ok: boolean; item: { id: number; eliminado_en: string; eliminado_por: string; motivo_eliminacion: string } }> {
    return this.http.post<{ ok: boolean; item: { id: number; eliminado_en: string; eliminado_por: string; motivo_eliminacion: string } }>(
      `${environment.apiUrl}/flota/combustible/eliminar`,
      payload,
      { withCredentials: true },
    );
  }

  importFlotaCombustible(payload: {
    file_name: string;
    file_content: string;
    proveedor_id?: number | null;
  }): Observable<FlotaCombustibleImportResult> {
    return this.http.post<FlotaCombustibleImportResult>(`${environment.apiUrl}/flota/combustible/import`, payload, { withCredentials: true });
  }

  previewFlotaCombustibleImport(payload: {
    file_name: string;
    file_content: string;
    proveedor_id?: number | null;
  }): Observable<FlotaCombustibleImportPreviewResult> {
    return this.http.post<FlotaCombustibleImportPreviewResult>(`${environment.apiUrl}/flota/combustible/import/preview`, payload, { withCredentials: true });
  }

  getFlotaGastos(filters: {
    desde?: string;
    hasta?: string;
    vehiculo_id?: number | null;
    tipo_gasto_id?: number | null;
    sucursal?: string | null;
  } = {}): Observable<{ items: FlotaGastoRow[] }> {
    let params = new HttpParams();
    if (filters.desde) {
      params = params.set('desde', filters.desde);
    }
    if (filters.hasta) {
      params = params.set('hasta', filters.hasta);
    }
    if (filters.vehiculo_id) {
      params = params.set('vehiculo_id', filters.vehiculo_id);
    }
    if (filters.tipo_gasto_id) {
      params = params.set('tipo_gasto_id', filters.tipo_gasto_id);
    }
    if (filters.sucursal) {
      params = params.set('sucursal', filters.sucursal);
    }
    return this.http.get<{ items: FlotaGastoRow[] }>(`${environment.apiUrl}/flota/gastos`, { params, withCredentials: true });
  }

  saveFlotaGasto(payload: {
    id?: number | null;
    fecha: string;
    vehiculo_id: number;
    tipo_gasto_id: number;
    proveedor_id?: number | null;
    proveedor_nombre?: string;
    proveedor_ruc?: string;
    importe: number | string;
    km_actual?: number | string | null;
    nro_factura?: string;
    detalle?: string;
  }): Observable<FlotaGastoRow> {
    return this.http.post<FlotaGastoRow>(`${environment.apiUrl}/flota/gastos`, payload, { withCredentials: true });
  }

  deleteFlotaGasto(payload: { id: number; motivo: string }): Observable<{ ok: boolean; item: { id: number; eliminado_en: string; eliminado_por: string; motivo_eliminacion: string } }> {
    return this.http.post<{ ok: boolean; item: { id: number; eliminado_en: string; eliminado_por: string; motivo_eliminacion: string } }>(
      `${environment.apiUrl}/flota/gastos/eliminar`,
      payload,
      { withCredentials: true },
    );
  }

  getFlotaResumenSemanal(filters: {
    mes?: number | null;
    anho?: number | null;
    vehiculo_id?: number | null;
    sucursal?: string | null;
  } = {}): Observable<FlotaResumenSemanalData> {
    let params = new HttpParams();
    if (filters.mes) {
      params = params.set('mes', filters.mes);
    }
    if (filters.anho) {
      params = params.set('anho', filters.anho);
    }
    if (filters.vehiculo_id) {
      params = params.set('vehiculo_id', filters.vehiculo_id);
    }
    if (filters.sucursal) {
      params = params.set('sucursal', filters.sucursal);
    }
    return this.http.get<FlotaResumenSemanalData>(`${environment.apiUrl}/flota/resumen-semanal`, { params, withCredentials: true });
  }

  getFlotaResumenMensualPdf(filters: {
    mes?: number | null;
    anho?: number | null;
    vehiculo_id?: number | null;
    sucursal?: string | null;
  } = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filters.mes) {
      params = params.set('mes', filters.mes);
    }
    if (filters.anho) {
      params = params.set('anho', filters.anho);
    }
    if (filters.vehiculo_id) {
      params = params.set('vehiculo_id', filters.vehiculo_id);
    }
    if (filters.sucursal) {
      params = params.set('sucursal', filters.sucursal);
    }
    return this.http.get(`${environment.apiUrl}/flota/resumen-mensual/pdf`, { params, responseType: 'blob', withCredentials: true });
  }

  createAdminUser(payload: {
    username: string;
    nombre: string;
    password: string;
    rol: string;
    sucursal_permitida?: string | null;
    activo?: boolean;
  }): Observable<{ user: AdminUser }> {
    return this.http.post<{ user: AdminUser }>(`${environment.apiUrl}/auth/users`, payload, { withCredentials: true });
  }

  updateAdminUser(payload: {
    id: number;
    nombre: string;
    rol: string;
    sucursal_permitida?: string | null;
    activo: boolean;
  }): Observable<{ user: AdminUser }> {
    return this.http.put<{ user: AdminUser }>(`${environment.apiUrl}/auth/users`, payload, { withCredentials: true });
  }

  updateAdminPassword(payload: { id: number; password: string }): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${environment.apiUrl}/auth/users/password`, payload, { withCredentials: true });
  }

  getDashboard(desde?: string, hasta?: string): Observable<DashboardData> {
    let params = new HttpParams();
    if (desde) {
      params = params.set('desde', desde);
    }
    if (hasta) {
      params = params.set('hasta', hasta);
    }
    return this.http.get<DashboardData>(`${environment.apiUrl}/dashboard`, { params, withCredentials: true });
  }

  getRecepcion(sucursal: RecepcionSucursalSlug, fecha?: string): Observable<RecepcionData> {
    let params = new HttpParams();
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http.get<RecepcionData>(`${environment.apiUrl}/recepcion/${sucursal}`, { params, withCredentials: true });
  }

  getRecepcionPdf(sucursal: RecepcionSucursalSlug, fecha?: string): Observable<Blob> {
    let params = new HttpParams();
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http.get(`${environment.apiUrl}/recepcion/${sucursal}/pdf`, { params, responseType: 'blob', withCredentials: true });
  }

  updateRecepcionDistribucion(sucursal: RecepcionSucursalSlug, payload: {
    id: number;
    kg: number | string;
    faltante_kg?: number | string;
    sobrante_kg?: number | string;
    registrado_por?: string;
    nota?: string;
  }): Observable<RecepcionDistribucion> {
    return this.http.post<RecepcionDistribucion>(
      `${environment.apiUrl}/recepcion/${sucursal}/distribuciones`,
      payload,
      { withCredentials: true },
    );
  }

  addMenudencia(sucursal: RecepcionSucursalSlug, payload: {
    fecha: string;
    producto: string;
    kg: number | string;
    unidades: number | string;
  }): Observable<RecepcionMenudencia> {
    return this.http.post<RecepcionMenudencia>(`${environment.apiUrl}/recepcion/${sucursal}/menudencias`, payload, { withCredentials: true });
  }

  updateMenudencia(sucursal: RecepcionSucursalSlug, payload: RecepcionMenudencia): Observable<RecepcionMenudencia> {
    return this.http.put<RecepcionMenudencia>(`${environment.apiUrl}/recepcion/${sucursal}/menudencias`, payload, { withCredentials: true });
  }

  deleteMenudencia(sucursal: RecepcionSucursalSlug, id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${environment.apiUrl}/recepcion/${sucursal}/menudencias`, {
      params: new HttpParams().set('id', id),
      withCredentials: true,
    });
  }

  getDistribuciones(loteId?: number | null): Observable<DistribucionesData> {
    let params = new HttpParams();
    if (loteId) {
      params = params.set('lote_id', loteId);
    }
    return this.http.get<DistribucionesData>(`${environment.apiUrl}/distribuciones`, { params, withCredentials: true });
  }

  saveDistribucion(payload: {
    id?: number | null;
    lote_id: number;
    fecha: string;
    local: string;
    kg: number | string;
    cabezas: number | string;
    nota?: string;
    diferencia_kg?: number | string;
  }): Observable<DistribucionRow> {
    return this.http.post<DistribucionRow>(`${environment.apiUrl}/distribuciones`, payload, { withCredentials: true });
  }

  deleteDistribucion(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${environment.apiUrl}/distribuciones`, {
      params: new HttpParams().set('id', id),
      withCredentials: true,
    });
  }

  getComprasFaena(loteId?: number | null): Observable<ComprasFaenaData> {
    let params = new HttpParams();
    if (loteId) {
      params = params.set('lote_id', loteId);
    }
    return this.http.get<ComprasFaenaData>(`${environment.apiUrl}/compras-faena`, { params, withCredentials: true });
  }

  saveCompraLote(payload: {
    id?: number | null;
    lote: string;
    empresa: string;
    fecha: string;
    cantidad: number | string;
    monto: number | string;
    peso_compra_kg: number | string;
  }): Observable<CompraFaenaLote> {
    return this.http.post<CompraFaenaLote>(`${environment.apiUrl}/compras-faena/lotes`, payload, { withCredentials: true });
  }

  addFaena(payload: {
    lote_id: number;
    fecha: string;
    cantidad: number | string;
    nota?: string;
  }): Observable<CompraFaenaRow> {
    return this.http.post<CompraFaenaRow>(`${environment.apiUrl}/compras-faena/faenas`, payload, { withCredentials: true });
  }

  setFaenaTotal(payload: {
    lote_id: number;
    fecha: string;
    cantidad_total: number | string;
    nota?: string;
  }): Observable<CompraFaenaRow> {
    return this.http.post<CompraFaenaRow>(`${environment.apiUrl}/compras-faena/faena-total`, payload, { withCredentials: true });
  }

  getResumenes(loteIds: number[] = []): Observable<ResumenesData> {
    let params = new HttpParams();
    if (loteIds.length > 0) {
      params = params.set('lote_ids', loteIds.join(','));
    }
    return this.http.get<ResumenesData>(`${environment.apiUrl}/resumenes`, { params, withCredentials: true });
  }

  getResumenesPdf(loteIds: number[]): Observable<Blob> {
    const params = new HttpParams().set('lote_ids', loteIds.join(','));
    return this.http.get(`${environment.apiUrl}/resumenes/pdf`, { params, responseType: 'blob', withCredentials: true });
  }

  marcarResumenesCerrados(loteIds: number[], cerrado = true): Observable<{ ok: boolean; lotes: Array<{ id: number; cerrado: boolean }> }> {
    return this.http.post<{ ok: boolean; lotes: Array<{ id: number; cerrado: boolean }> }>(
      `${environment.apiUrl}/resumenes/cerrar`,
      { lote_ids: loteIds, cerrado },
      { withCredentials: true },
    );
  }
}
