import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { PreferencesService } from './core/preferences/preferences.service';
import { AppShellComponent } from './layout/app-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppShellComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly preferences = inject(PreferencesService);

  darkMode = false;
  authLoading = signal(true);
  authError = signal('');
  currentUser = this.authService.currentUser;

  ngOnInit(): void {
    this.darkMode = this.preferences.getDarkMode();
    this.restoreSession();
  }

  restoreSession(): void {
    this.authLoading.set(true);
    this.authError.set('');
    this.authService.getCurrentUser().subscribe({
      next: () => {
        this.authLoading.set(false);
      },
      error: (err) => {
        this.authService.clearCurrentUser();
        this.authLoading.set(false);
        if (err?.status && err.status !== 401) {
          this.authError.set(err?.error?.error ?? 'No se pudo verificar la sesion.');
        }
      },
    });
  }
}
