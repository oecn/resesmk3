import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import {
  RecepcionData,
  RecepcionDistribucion,
  RecepcionMenudencia,
  RecepcionSucursalSlug,
} from './recepcion.models';

@Injectable({ providedIn: 'root' })
export class RecepcionService {
  constructor(private readonly api: ApiService) {}

  getRecepcion(sucursal: RecepcionSucursalSlug, fecha?: string): Observable<RecepcionData> {
    return this.api.get<RecepcionData>(`/recepcion/${sucursal}`, { fecha });
  }

  getRecepcionPdf(sucursal: RecepcionSucursalSlug, fecha?: string): Observable<Blob> {
    return this.api.getBlob(`/recepcion/${sucursal}/pdf`, { fecha });
  }

  updateRecepcionDistribucion(sucursal: RecepcionSucursalSlug, payload: {
    id: number;
    kg: number | string;
    faltante_kg?: number | string;
    sobrante_kg?: number | string;
    registrado_por?: string;
    nota?: string;
  }): Observable<RecepcionDistribucion> {
    return this.api.post<RecepcionDistribucion>(`/recepcion/${sucursal}/distribuciones`, payload);
  }

  addMenudencia(sucursal: RecepcionSucursalSlug, payload: {
    fecha: string;
    producto: string;
    kg: number | string;
    unidades: number | string;
  }): Observable<RecepcionMenudencia> {
    return this.api.post<RecepcionMenudencia>(`/recepcion/${sucursal}/menudencias`, payload);
  }

  updateMenudencia(sucursal: RecepcionSucursalSlug, payload: RecepcionMenudencia): Observable<RecepcionMenudencia> {
    return this.api.put<RecepcionMenudencia>(`/recepcion/${sucursal}/menudencias`, payload);
  }

  deleteMenudencia(sucursal: RecepcionSucursalSlug, id: number): Observable<{ ok: boolean }> {
    return this.api.delete<{ ok: boolean }>(`/recepcion/${sucursal}/menudencias`, { id });
  }
}
