import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent implements OnInit {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.authService.currentUserSnapshot()) {
      this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    }
  }

  login(): void {
    this.loading.set(true);
    this.error.set('');
    this.authService.login({
      username: this.username,
      password: this.password,
    }).subscribe({
      next: () => {
        this.password = '';
        this.loading.set(false);
        this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.loginErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private loginErrorMessage(err: HttpErrorResponse): string {
    const backendMessage = this.extractBackendError(err);
    if (err.status === 0) {
      return 'No se pudo conectar con el backend. Verifica que el servidor este iniciado y que la URL de API sea correcta.';
    }
    if (err.status === 401) {
      return `Login rechazado: ${backendMessage || 'usuario o password incorrectos.'}`;
    }
    if (err.status === 403) {
      return `Login sin permisos: ${backendMessage || 'tu usuario no tiene permiso para ingresar.'}`;
    }
    if (err.status >= 500) {
      return `Error del servidor al iniciar sesion (HTTP ${err.status}): ${backendMessage || 'revisa la consola del backend.'}`;
    }
    return `No se pudo iniciar sesion (HTTP ${err.status || 'sin respuesta'}): ${backendMessage || err.message || 'error desconocido.'}`;
  }

  private extractBackendError(err: HttpErrorResponse): string {
    const payload = err.error;
    if (!payload) {
      return '';
    }
    if (typeof payload === 'string') {
      return payload;
    }
    if (typeof payload?.error === 'string') {
      return payload.error;
    }
    if (typeof payload?.message === 'string') {
      return payload.message;
    }
    return '';
  }
}
