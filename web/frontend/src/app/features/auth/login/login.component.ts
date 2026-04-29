import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  @Input() username = '';
  @Input() password = '';
  @Input() loading = false;
  @Input() error = '';

  @Output() usernameChange = new EventEmitter<string>();
  @Output() passwordChange = new EventEmitter<string>();
  @Output() loginRequested = new EventEmitter<void>();

  onUsernameChange(value: string): void {
    this.username = value;
    this.usernameChange.emit(value);
  }

  onPasswordChange(value: string): void {
    this.password = value;
    this.passwordChange.emit(value);
  }

  submit(): void {
    this.loginRequested.emit();
  }
}
