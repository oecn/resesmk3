import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import {
  AcuerdoComercial,
  AcuerdoHistorialResponse,
  AcuerdoComercialPayload,
  AcuerdosComercialesResponse,
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

  listHistorial(acuerdoId: number): Observable<AcuerdoHistorialResponse> {
    return this.api.get<AcuerdoHistorialResponse>('/acuerdos-comerciales/historial', { acuerdo_id: acuerdoId });
  }

  listHistorialProveedor(proveedorId: number): Observable<AcuerdosComercialesResponse> {
    return this.api.get<AcuerdosComercialesResponse>('/acuerdos-comerciales/historial-proveedor', { proveedor_id: proveedorId });
  }

  listProveedores(search = ''): Observable<ProveedoresComercialesResponse> {
    return this.api.get<ProveedoresComercialesResponse>('/acuerdos-comerciales/proveedores', { search });
  }

  saveProveedor(payload: ProveedorComercialPayload): Observable<ProveedorComercial> {
    return this.api.post<ProveedorComercial>('/acuerdos-comerciales/proveedores', payload);
  }
}
