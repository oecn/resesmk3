import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { CompraFaenaLote, CompraFaenaRow, ComprasFaenaData } from './compras-faena.models';

@Injectable({ providedIn: 'root' })
export class ComprasFaenaService {
  constructor(private readonly api: ApiService) {}

  getComprasFaena(loteId?: number | null): Observable<ComprasFaenaData> {
    return this.api.get<ComprasFaenaData>('/compras-faena', { lote_id: loteId });
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
    return this.api.post<CompraFaenaLote>('/compras-faena/lotes', payload);
  }

  deleteCompraLote(payload: { id: number }): Observable<{ ok: boolean; lote_id: number; lote: string }> {
    return this.api.post<{ ok: boolean; lote_id: number; lote: string }>('/compras-faena/lotes/eliminar', payload);
  }

  addFaena(payload: {
    lote_id: number;
    fecha: string;
    cantidad: number | string;
    nota?: string;
  }): Observable<CompraFaenaRow> {
    return this.api.post<CompraFaenaRow>('/compras-faena/faenas', payload);
  }

  setFaenaTotal(payload: {
    lote_id: number;
    fecha: string;
    cantidad_total: number | string;
    nota?: string;
  }): Observable<CompraFaenaRow> {
    return this.api.post<CompraFaenaRow>('/compras-faena/faena-total', payload);
  }
}
