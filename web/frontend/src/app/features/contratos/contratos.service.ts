import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { Contrato, ContratosResponse } from './contratos.models';

@Injectable({ providedIn: 'root' })
export class ContratosService {
  constructor(private readonly api: ApiService) {}

  listContratos(search = ''): Observable<ContratosResponse> {
    return this.api.get<ContratosResponse>('/contratos', { search });
  }

  saveContrato(payload: Contrato): Observable<Contrato> {
    return this.api.post<Contrato>('/contratos', payload);
  }

  deleteContrato(id: number): Observable<{ ok: boolean }> {
    return this.api.delete<{ ok: boolean }>('/contratos', { id });
  }
}
