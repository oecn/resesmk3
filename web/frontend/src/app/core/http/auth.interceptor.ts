import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError(err => {
      if (
        err.status === 401 &&
        !req.url.includes('/auth/login') &&
        !router.url.startsWith('/login')
      ) {
        authService.clearCurrentUser();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
