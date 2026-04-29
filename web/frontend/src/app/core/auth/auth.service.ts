import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  login(payload: { username: string; password: string }): Observable<{ ok: boolean; user: CurrentUser }> {
    return this.http.post<{ ok: boolean; user: CurrentUser }>(`${environment.apiUrl}/auth/login`, payload, {
      withCredentials: true,
    });
  }

  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true });
  }

  getCurrentUser(): Observable<{ user: CurrentUser }> {
    return this.http.get<{ user: CurrentUser }>(`${environment.apiUrl}/auth/me`, { withCredentials: true });
  }
}
