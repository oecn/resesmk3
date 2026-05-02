import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { AdminUser, AdminUsersData } from './admin-users.models';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  constructor(private readonly api: ApiService) {}

  getAdminUsers(): Observable<AdminUsersData> {
    return this.api.get<AdminUsersData>('/auth/users');
  }

  createAdminUser(payload: {
    username: string;
    nombre: string;
    password: string;
    rol: string;
    sucursal_permitida?: string | null;
    activo?: boolean;
    modulos_permitidos?: string[];
  }): Observable<{ user: AdminUser }> {
    return this.api.post<{ user: AdminUser }>('/auth/users', payload);
  }

  updateAdminUser(payload: {
    id: number;
    nombre: string;
    rol: string;
    sucursal_permitida?: string | null;
    activo: boolean;
    modulos_permitidos?: string[];
  }): Observable<{ user: AdminUser }> {
    return this.api.put<{ user: AdminUser }>('/auth/users', payload);
  }

  updateAdminPassword(payload: { id: number; password: string }): Observable<{ ok: boolean }> {
    return this.api.put<{ ok: boolean }>('/auth/users/password', payload);
  }
}
