import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppModuleKey } from '../core/auth/auth.models';

@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-nav.component.html',
  styleUrl: './sidebar-nav.component.css',
})
export class SidebarNavComponent {
  @Input({ required: true }) vista!: AppModuleKey;
  @Input() viewMenuOpen = false;
  @Input() darkMode = false;
  @Input() userInitials = 'RC';
  @Input() userDisplayName = 'Sin sesion';
  @Input() userRoleLabel = 'Invitado';
  @Input() canViewDashboard = false;
  @Input() canViewEstadisticas = false;
  @Input() canManageComprasFaena = false;
  @Input() canViewResumenes = false;
  @Input() canManageDistribuciones = false;
  @Input() canManageFlota = false;
  @Input() canManageRecepcion = false;
  @Input() canManageUsers = false;
  @Input() canViewAcuerdos = false;
  @Input() canViewContratos = false;
  @Input() canViewArchivosDirectorio = false;

  @Output() toggleMenu = new EventEmitter<void>();
  @Output() closeMenu = new EventEmitter<void>();
  @Output() toggleTheme = new EventEmitter<void>();
  @Output() selectView = new EventEmitter<AppModuleKey>();
  @Output() logout = new EventEmitter<void>();
}
