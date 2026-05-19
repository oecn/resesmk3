import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppModuleKey } from '../../../core/auth/auth.models';
import { AdminUser, AdminUsersData } from './admin-users.models';
import { AdminUsersService } from './admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit {
  loading = signal(false);
  error = signal('');
  ok = signal('');
  adminUsers = signal<AdminUsersData | null>(null);
  usuarioNombre = '';
  usuarioUsername = '';
  usuarioPassword = '';
  usuarioRol = 'recepcion';
  usuarioSucursalPermitida = 'luque';
  usuarioActivo = true;
  usuarioModulosPermitidos: AppModuleKey[] = ['recepcion', 'flota'];
  usuarioPasswordEditId: number | null = null;
  usuarioPasswordNueva = '';
  moduleEditorOpen = false;
  moduleEditorUser: AdminUser | null = null;
  moduleEditorDraft: AppModuleKey[] = [];

  constructor(private readonly adminUsersService: AdminUsersService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading.set(true);
    this.error.set('');
    this.adminUsersService.getAdminUsers().subscribe({
      next: (data) => {
        this.adminUsers.set(data);
        if (!data.roles.includes(this.usuarioRol)) {
          this.usuarioRol = data.roles[0] ?? 'recepcion';
        }
        for (const user of data.users) {
          user.modulos_permitidos = this.normalizarModulos(user.rol, user.modulos_permitidos);
        }
        this.usuarioModulosPermitidos = this.normalizarModulos(this.usuarioRol, this.usuarioModulosPermitidos);
        this.ajustarFormularioSucursal();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar usuarios.');
        this.loading.set(false);
      },
    });
  }

  crearUsuario(): void {
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.adminUsersService.createAdminUser({
      username: this.usuarioUsername,
      nombre: this.usuarioNombre,
      password: this.usuarioPassword,
      rol: this.usuarioRol,
      sucursal_permitida: this.usuarioRol === 'recepcion' ? this.usuarioSucursalPermitida : null,
      activo: this.usuarioActivo,
      modulos_permitidos: this.normalizarModulos(this.usuarioRol, this.usuarioModulosPermitidos),
    }).subscribe({
      next: () => {
        this.usuarioNombre = '';
        this.usuarioUsername = '';
        this.usuarioPassword = '';
        this.usuarioRol = this.adminUsers()?.roles[0] ?? 'recepcion';
        this.usuarioSucursalPermitida = 'luque';
        this.usuarioActivo = true;
        this.usuarioModulosPermitidos = this.normalizarModulos(this.usuarioRol);
        this.ok.set('Usuario creado.');
        this.cargarUsuarios();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo crear el usuario.');
        this.loading.set(false);
      },
    });
  }

  guardarUsuario(user: AdminUser): void {
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.adminUsersService.updateAdminUser({
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      sucursal_permitida: user.rol === 'recepcion' ? (user.sucursal_permitida ?? 'luque') : null,
      activo: user.activo,
      modulos_permitidos: this.normalizarModulos(user.rol, user.modulos_permitidos),
    }).subscribe({
      next: () => {
        this.ok.set(`Usuario ${user.username} actualizado.`);
        this.cargarUsuarios();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo actualizar el usuario.');
        this.loading.set(false);
      },
    });
  }

  iniciarCambioPassword(user: AdminUser): void {
    this.usuarioPasswordEditId = user.id;
    this.usuarioPasswordNueva = '';
    this.error.set('');
    this.ok.set('');
  }

  cancelarCambioPassword(): void {
    this.usuarioPasswordEditId = null;
    this.usuarioPasswordNueva = '';
  }

  guardarPasswordUsuario(user: AdminUser): void {
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.adminUsersService.updateAdminPassword({
      id: user.id,
      password: this.usuarioPasswordNueva,
    }).subscribe({
      next: () => {
        this.ok.set(`Password actualizada para ${user.username}.`);
        this.usuarioPasswordEditId = null;
        this.usuarioPasswordNueva = '';
        this.cargarUsuarios();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo actualizar la password.');
        this.loading.set(false);
      },
    });
  }

  onUsuarioRolChange(): void {
    this.usuarioModulosPermitidos = this.normalizarModulos(this.usuarioRol, this.usuarioModulosPermitidos);
    this.ajustarFormularioSucursal();
  }

  onUserRolChange(user: AdminUser): void {
    user.modulos_permitidos = this.normalizarModulos(user.rol, user.modulos_permitidos);
    if (user.rol !== 'recepcion') {
      user.sucursal_permitida = null;
    }
  }

  abrirEditorModulos(user: AdminUser | null = null): void {
    this.moduleEditorOpen = true;
    this.moduleEditorUser = user;
    const role = user?.rol ?? this.usuarioRol;
    const selected = user?.modulos_permitidos ?? this.usuarioModulosPermitidos;
    this.moduleEditorDraft = this.normalizarModulos(role, selected);
    this.error.set('');
    this.ok.set('');
  }

  cerrarEditorModulos(): void {
    this.moduleEditorOpen = false;
    this.moduleEditorUser = null;
    this.moduleEditorDraft = [];
  }

  guardarEditorModulos(): void {
    if (this.moduleEditorUser) {
      const user = this.moduleEditorUser;
      user.modulos_permitidos = this.normalizarModulos(user.rol, this.moduleEditorDraft);
      this.cerrarEditorModulos();
      this.guardarUsuario(user);
      return;
    } else {
      this.usuarioModulosPermitidos = this.normalizarModulos(this.usuarioRol, this.moduleEditorDraft);
    }
    this.cerrarEditorModulos();
  }

  toggleModulo(key: AppModuleKey, checked: boolean): void {
    if (checked && !this.moduleEditorDraft.includes(key)) {
      this.moduleEditorDraft = [...this.moduleEditorDraft, key];
      return;
    }
    if (!checked) {
      this.moduleEditorDraft = this.moduleEditorDraft.filter((item) => item !== key);
    }
  }

  moduloChecked(key: AppModuleKey): boolean {
    return this.moduleEditorDraft.includes(key);
  }

  modulosResumen(modulos: AppModuleKey[] | undefined): string {
    const modules = this.adminUsers()?.modules ?? [];
    const selected = new Set(modulos ?? []);
    const labels = modules.filter((item) => selected.has(item.key)).map((item) => item.label);
    return labels.length ? labels.join(', ') : 'Sin modulos';
  }

  private normalizarModulos(rol: string, modulos: AppModuleKey[] | string[] = []): AppModuleKey[] {
    const modules = this.adminUsers()?.modules ?? [
      { key: 'dashboard' as AppModuleKey, label: 'Dashboard' },
      { key: 'compras-faena' as AppModuleKey, label: 'Compras y faena' },
      { key: 'resumenes' as AppModuleKey, label: 'Resumenes' },
      { key: 'recepcion' as AppModuleKey, label: 'Recepcion' },
      { key: 'distribuciones' as AppModuleKey, label: 'Distribuciones' },
      { key: 'flota' as AppModuleKey, label: 'Flota' },
      { key: 'acuerdos-comerciales' as AppModuleKey, label: 'Acuerdos comerciales' },
      { key: 'contratos' as AppModuleKey, label: 'Contratos' },
      { key: 'archivos-directorio' as AppModuleKey, label: 'Archivos de directorio' },
      { key: 'usuarios' as AppModuleKey, label: 'Usuarios' },
    ];
    const allowed = new Set(modules.map((item) => item.key));
    const defaults: Record<string, AppModuleKey[]> = {
      admin: modules.map((item) => item.key),
      supervisor: [
        'dashboard',
        'compras-faena',
        'resumenes',
        'recepcion',
        'distribuciones',
        'flota',
        'acuerdos-comerciales',
        'contratos',
        'archivos-directorio',
      ],
      recepcion: ['recepcion', 'flota'],
    };
    const source = modulos.length ? modulos : (defaults[rol] ?? []);
    const selected = source.filter((item): item is AppModuleKey => allowed.has(item as AppModuleKey));
    const unique = Array.from(new Set(selected));
    return rol === 'admin' ? unique : unique.filter((item) => item !== 'usuarios');
  }

  private ajustarFormularioSucursal(): void {
    if (this.usuarioRol !== 'recepcion') {
      this.usuarioSucursalPermitida = 'luque';
    }
  }
}
