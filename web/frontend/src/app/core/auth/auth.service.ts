import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../http/api.service';
import { CurrentUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserState = signal<CurrentUser | null>(null);
  readonly currentUser = this.currentUserState.asReadonly();

  constructor(private readonly api: ApiService) {}

  currentUserSnapshot(): CurrentUser | null {
    return this.currentUserState();
  }

  clearCurrentUser(): void {
    this.currentUserState.set(null);
  }

  login(payload: { username: string; password: string }): Observable<{ ok: boolean; user: CurrentUser }> {
    return this.api
      .post<{ ok: boolean; user: CurrentUser }>('/auth/login', payload)
      .pipe(tap(({ user }) => this.currentUserState.set(user)));
  }

  logout(): Observable<{ ok: boolean }> {
    return this.api
      .post<{ ok: boolean }>('/auth/logout', {})
      .pipe(tap(() => this.currentUserState.set(null)));
  }

  getCurrentUser(): Observable<{ user: CurrentUser }> {
    return this.api
      .get<{ user: CurrentUser }>('/auth/me')
      .pipe(tap(({ user }) => this.currentUserState.set(user)));
  }
}
