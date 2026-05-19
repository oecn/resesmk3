import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import {
  FlotaCatalogosData,
  FlotaCombustibleImportPreviewResult,
  FlotaCombustibleImportResult,
  FlotaCombustibleRow,
  FlotaGastoRow,
  FlotaProveedor,
  FlotaResumenSemanalData,
  FlotaVehiculo,
} from './flota.models';

@Injectable({ providedIn: 'root' })
export class FlotaService {
  constructor(private readonly api: ApiService) {}

  getFlotaCatalogos(): Observable<FlotaCatalogosData> {
    return this.api.get<FlotaCatalogosData>('/flota/catalogos');
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
    return this.api.post<FlotaVehiculo>('/flota/vehiculos', payload);
  }

  saveFlotaProveedor(payload: {
    id?: number | null;
    nombre: string;
    tipo: string;
    ruc?: string;
    telefono?: string;
    activo?: boolean;
  }): Observable<FlotaProveedor> {
    return this.api.post<FlotaProveedor>('/flota/proveedores', payload);
  }

  getFlotaCombustible(filters: {
    desde?: string;
    hasta?: string;
    vehiculo_id?: number | null;
    sucursal?: string | null;
  } = {}): Observable<{ items: FlotaCombustibleRow[] }> {
    return this.api.get<{ items: FlotaCombustibleRow[] }>('/flota/combustible', filters);
  }

  saveFlotaCombustible(payload: {
    id?: number | null;
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
    return this.api.post<FlotaCombustibleRow>('/flota/combustible', payload);
  }

  deleteFlotaCombustible(payload: { id: number; motivo: string }): Observable<{ ok: boolean; item: { id: number; eliminado_en: string; eliminado_por: string; motivo_eliminacion: string } }> {
    return this.api.post<{ ok: boolean; item: { id: number; eliminado_en: string; eliminado_por: string; motivo_eliminacion: string } }>(
      '/flota/combustible/eliminar',
      payload,
    );
  }

  importFlotaCombustible(payload: {
    file_name: string;
    file_content: string;
    proveedor_id?: number | null;
  }): Observable<FlotaCombustibleImportResult> {
    return this.api.post<FlotaCombustibleImportResult>('/flota/combustible/import', payload);
  }

  previewFlotaCombustibleImport(payload: {
    file_name: string;
    file_content: string;
    proveedor_id?: number | null;
  }): Observable<FlotaCombustibleImportPreviewResult> {
    return this.api.post<FlotaCombustibleImportPreviewResult>('/flota/combustible/import/preview', payload);
  }

  getFlotaGastos(filters: {
    desde?: string;
    hasta?: string;
    vehiculo_id?: number | null;
    tipo_gasto_id?: number | null;
    sucursal?: string | null;
  } = {}): Observable<{ items: FlotaGastoRow[] }> {
    return this.api.get<{ items: FlotaGastoRow[] }>('/flota/gastos', filters);
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
    return this.api.post<FlotaGastoRow>('/flota/gastos', payload);
  }

  deleteFlotaGasto(payload: { id: number; motivo: string }): Observable<{ ok: boolean; item: { id: number; eliminado_en: string; eliminado_por: string; motivo_eliminacion: string } }> {
    return this.api.post<{ ok: boolean; item: { id: number; eliminado_en: string; eliminado_por: string; motivo_eliminacion: string } }>(
      '/flota/gastos/eliminar',
      payload,
    );
  }

  getFlotaResumenSemanal(filters: {
    mes?: number | null;
    anho?: number | null;
    vehiculo_id?: number | null;
    sucursal?: string | null;
  } = {}): Observable<FlotaResumenSemanalData> {
    return this.api.get<FlotaResumenSemanalData>('/flota/resumen-semanal', filters);
  }

  getFlotaResumenMensualPdf(filters: {
    mes?: number | null;
    anho?: number | null;
    vehiculo_id?: number | null;
    sucursal?: string | null;
  } = {}): Observable<Blob> {
    return this.api.getBlob('/flota/resumen-mensual/pdf', filters);
  }
}
