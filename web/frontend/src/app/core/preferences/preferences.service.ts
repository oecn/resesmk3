import { Injectable } from '@angular/core';
import { AppModuleKey } from '../auth/auth.models';
import { MODULE_TO_ROUTE } from '../navigation/navigation.config';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly themeStorageKey = 'reces-dashboard-theme';
  private readonly viewStorageKey = 'reces-dashboard-view';

  getDarkMode(): boolean {
    return localStorage.getItem(this.themeStorageKey) === 'dark';
  }

  setDarkMode(enabled: boolean): void {
    localStorage.setItem(this.themeStorageKey, enabled ? 'dark' : 'light');
  }

  getPreferredModule(): AppModuleKey | null {
    const stored = localStorage.getItem(this.viewStorageKey) as AppModuleKey | null;
    return stored && MODULE_TO_ROUTE[stored] ? stored : null;
  }

  setPreferredModule(module: AppModuleKey): void {
    localStorage.setItem(this.viewStorageKey, module);
  }
}
