import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

type QueryValue = string | number | boolean | null | undefined;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, params?: Record<string, QueryValue>): Observable<T> {
    return this.http.get<T>(this.url(path), {
      params: this.params(params),
      withCredentials: true,
    });
  }

  getBlob(path: string, params?: Record<string, QueryValue>): Observable<Blob> {
    return this.http.get(this.url(path), {
      params: this.params(params),
      responseType: 'blob',
      withCredentials: true,
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body, { withCredentials: true });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body, { withCredentials: true });
  }

  delete<T>(path: string, params?: Record<string, QueryValue>): Observable<T> {
    return this.http.delete<T>(this.url(path), {
      params: this.params(params),
      withCredentials: true,
    });
  }

  private url(path: string): string {
    return `${environment.apiUrl}${path}`;
  }

  private params(values?: Record<string, QueryValue>): HttpParams {
    let params = new HttpParams();
    Object.entries(values ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
