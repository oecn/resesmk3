import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { ResumenesData } from './resumenes.models';

@Injectable({ providedIn: 'root' })
export class ResumenesService {
  constructor(private readonly api: ApiService) {}

  getResumenes(loteIds: number[] = []): Observable<ResumenesData> {
    return this.api.get<ResumenesData>('/resumenes', {
      lote_ids: loteIds.length > 0 ? loteIds.join(',') : undefined,
    });
  }

  getResumenesPdf(loteIds: number[]): Observable<Blob> {
    return this.api.getBlob('/resumenes/pdf', { lote_ids: loteIds.join(',') });
  }

  marcarResumenesCerrados(loteIds: number[], cerrado = true): Observable<{ ok: boolean; lotes: Array<{ id: number; cerrado: boolean }> }> {
    return this.api.post<{ ok: boolean; lotes: Array<{ id: number; cerrado: boolean }> }>('/resumenes/cerrar', {
      lote_ids: loteIds,
      cerrado,
    });
  }
}
