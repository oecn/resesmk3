import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { DashboardData } from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardFeatureService {
  constructor(private readonly api: ApiService) {}

  getDashboard(desde?: string, hasta?: string): Observable<DashboardData> {
    return this.api.get<DashboardData>('/dashboard', { desde, hasta });
  }

  getMenudenciasPdf(desde?: string, hasta?: string): Observable<Blob> {
    return this.api.getBlob('/dashboard/menudencias/pdf', { desde, hasta });
  }
}
