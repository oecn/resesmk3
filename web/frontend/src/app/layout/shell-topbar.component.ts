import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AppModuleKey } from '../core/auth/auth.models';

@Component({
  selector: 'app-shell-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shell-topbar.component.html',
  styleUrl: './shell-topbar.component.css',
})
export class ShellTopbarComponent {
  @Input({ required: true }) vista!: AppModuleKey;
}
