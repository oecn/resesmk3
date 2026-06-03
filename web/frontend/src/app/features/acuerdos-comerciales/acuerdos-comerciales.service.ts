import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import {
  AcuerdoComercial,
  AcuerdoCobranza,
  AcuerdoCobranzaPayload,
  AcuerdoHistorialResponse,
  AcuerdoComercialPayload,
  AcuerdosCobranzasResponse,
  AcuerdosCobranzasAnualResponse,
  AcuerdosComercialesResponse,
  AcuerdosEstadisticasResponse,
  AcuerdosUbicacionesImportResponse,
  MapaUbicacionValorResponse,
  MapaUbicacionesResponse,
  ProveedorComercial,
  ProveedorComercialPayload,
  ProveedoresComercialesResponse,
} from './acuerdos-comerciales.models';

@Injectable({ providedIn: 'root' })
export class AcuerdosComercialesService {
  constructor(private readonly api: ApiService) {}

  listAcuerdos(search = ''): Observable<AcuerdosComercialesResponse> {
    return this.api.get<AcuerdosComercialesResponse>('/acuerdos-comerciales', { search });
  }

  saveAcuerdo(payload: AcuerdoComercialPayload): Observable<AcuerdoComercial> {
    return this.api.post<AcuerdoComercial>('/acuerdos-comerciales', payload);
  }

  descartarNegociacion(acuerdoId: number): Observable<{ ok: boolean; id: number }> {
    return this.api.delete<{ ok: boolean; id: number }>('/acuerdos-comerciales', { acuerdo_id: acuerdoId });
  }

  eliminarAcuerdo(acuerdoId: number, password: string): Observable<{ ok: boolean; id: number }> {
    return this.api.post<{ ok: boolean; id: number }>('/acuerdos-comerciales/eliminar', { id: acuerdoId, password });
  }

  listHistorial(acuerdoId: number): Observable<AcuerdoHistorialResponse> {
    return this.api.get<AcuerdoHistorialResponse>('/acuerdos-comerciales/historial', { acuerdo_id: acuerdoId });
  }

  listHistorialProveedor(proveedorId: number): Observable<AcuerdosComercialesResponse> {
    return this.api.get<AcuerdosComercialesResponse>('/acuerdos-comerciales/historial-proveedor', { proveedor_id: proveedorId });
  }

  listCobranzas(mes: number, anho: number): Observable<AcuerdosCobranzasResponse> {
    return this.api.get<AcuerdosCobranzasResponse>('/acuerdos-comerciales/cobranzas', { mes, anho });
  }

  listCobranzasAnual(anho: number): Observable<AcuerdosCobranzasAnualResponse> {
    return this.api.get<AcuerdosCobranzasAnualResponse>('/acuerdos-comerciales/cobranzas/anual', { anho });
  }

  getEstadisticas(mes: number, anho: number): Observable<AcuerdosEstadisticasResponse> {
    return this.api.get<AcuerdosEstadisticasResponse>('/acuerdos-comerciales/estadisticas', { mes, anho });
  }

  saveCobranza(payload: AcuerdoCobranzaPayload): Observable<AcuerdoCobranza> {
    return this.api.post<AcuerdoCobranza>('/acuerdos-comerciales/cobranzas', payload);
  }

  listProveedores(search = ''): Observable<ProveedoresComercialesResponse> {
    return this.api.get<ProveedoresComercialesResponse>('/acuerdos-comerciales/proveedores', { search });
  }

  listMapaUbicaciones(sucursal: string): Observable<MapaUbicacionesResponse> {
    return this.api.get<MapaUbicacionesResponse>('/acuerdos-comerciales/mapa/ubicaciones', { sucursal });
  }

  saveMapaUbicacionValor(payload: { sucursal: string; codigo: string; valor_gs: number | string; detalle?: string | null }): Observable<MapaUbicacionValorResponse> {
    return this.api.post<MapaUbicacionValorResponse>('/acuerdos-comerciales/mapa/ubicaciones/valor', payload);
  }

  saveProveedor(payload: ProveedorComercialPayload): Observable<ProveedorComercial> {
    return this.api.post<ProveedorComercial>('/acuerdos-comerciales/proveedores', payload);
  }

  importUbicacionesAregua(texto: string): Observable<AcuerdosUbicacionesImportResponse> {
    return this.api.post<AcuerdosUbicacionesImportResponse>('/acuerdos-comerciales/ubicaciones/aregua/import', { texto });
  }
}
