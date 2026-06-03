import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { EstadisticasData } from './estadisticas.models';

@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  constructor(private readonly api: ApiService) {}

  getEstadisticas(desde?: string, hasta?: string): Observable<EstadisticasData> {
    return this.api.get<EstadisticasData>('/estadisticas', { desde, hasta });
  }
}
