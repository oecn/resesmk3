import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { ArchivoPropiedad, ArchivosPropiedadesData } from './archivos-directorio.models';

@Injectable({ providedIn: 'root' })
export class ArchivosDirectorioService {
  constructor(private readonly api: ApiService) {}

  listPropiedades(params?: { search?: string; local?: string }): Observable<ArchivosPropiedadesData> {
    return this.api.get<ArchivosPropiedadesData>('/archivos-directorio/propiedades', params);
  }

  savePropiedad(payload: ArchivoPropiedad): Observable<ArchivoPropiedad> {
    return this.api.post<ArchivoPropiedad>('/archivos-directorio/propiedades', payload);
  }

  deletePropiedad(id: number): Observable<{ ok: boolean }> {
    return this.api.delete<{ ok: boolean }>('/archivos-directorio/propiedades', { id });
  }
}
