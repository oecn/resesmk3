import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { DistribucionesData, DistribucionRow } from '../../../shared/models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DistribucionesService {
  constructor(private readonly api: ApiService) {}

  getDistribuciones(loteId?: number | null): Observable<DistribucionesData> {
    return this.api.get<DistribucionesData>('/distribuciones', { lote_id: loteId });
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
    return this.api.post<DistribucionRow>('/distribuciones', payload);
  }

  deleteDistribucion(id: number): Observable<{ ok: boolean }> {
    return this.api.delete<{ ok: boolean }>('/distribuciones', { id });
  }
}
