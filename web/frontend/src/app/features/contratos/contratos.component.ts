import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Contrato, ContratosResponse } from './contratos.models';
import { ContratosService } from './contratos.service';

@Component({
  selector: 'app-contratos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contratos.component.html',
  styleUrl: './contratos.component.css',
})
export class ContratosComponent implements OnInit {
  loading = signal(false);
  error = signal('');
  ok = signal('');
  data = signal<ContratosResponse | null>(null);
  clausulasPopup = signal<Contrato | null>(null);
  contextoPopup = signal<Contrato | null>(null);
  search = '';
  contratoForm: Contrato = this.emptyContrato();

  constructor(private readonly contratosService: ContratosService) {}

  ngOnInit(): void {
    this.cargarContratos();
  }

  cargarContratos(): void {
    this.loading.set(true);
    this.error.set('');
    this.contratosService.listContratos(this.search).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudieron cargar los contratos.');
        this.loading.set(false);
      },
    });
  }

  guardarContrato(): void {
    if (!this.contratoForm.inicio_contrato || !this.contratoForm.ofrece_contrato.trim() || !this.contratoForm.contratante.trim()) {
      this.error.set('Inicio, quien ofrece y contratante son obligatorios.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.contratosService.saveContrato(this.contratoForm).subscribe({
      next: () => {
        this.ok.set(this.contratoForm.id ? 'Contrato actualizado.' : 'Contrato registrado.');
        this.cancelarEdicion();
        this.cargarContratos();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar el contrato.');
        this.loading.set(false);
      },
    });
  }

  editarContrato(item: Contrato): void {
    this.contratoForm = { ...item, monto_contrato: item.monto_contrato ?? '' };
    this.error.set('');
    this.ok.set('');
  }

  eliminarContrato(item: Contrato): void {
    if (!item.id) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.contratosService.deleteContrato(item.id).subscribe({
      next: () => {
        this.ok.set('Contrato eliminado.');
        if (this.contratoForm.id === item.id) {
          this.cancelarEdicion();
        }
        this.cargarContratos();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo eliminar el contrato.');
        this.loading.set(false);
      },
    });
  }

  cancelarEdicion(): void {
    this.contratoForm = this.emptyContrato();
  }

  verClausulas(item: Contrato): void {
    this.clausulasPopup.set(item);
  }

  cerrarClausulas(): void {
    this.clausulasPopup.set(null);
  }

  verContexto(item: Contrato): void {
    this.contextoPopup.set(item);
  }

  cerrarContexto(): void {
    this.contextoPopup.set(null);
  }

  fechaFinContrato(item: Contrato): string {
    const meses = Number(item.duracion_meses) || 0;
    if (!item.inicio_contrato || meses <= 0) {
      return '';
    }
    const desde = new Date(`${item.inicio_contrato}T00:00:00`);
    if (Number.isNaN(desde.getTime())) {
      return '';
    }
    const hasta = new Date(desde);
    hasta.setMonth(hasta.getMonth() + meses);
    hasta.setDate(hasta.getDate() - 1);
    return this.toIsoDate(hasta);
  }

  diasParaVencimiento(item: Contrato): number | null {
    const fechaFin = this.fechaFinContrato(item);
    if (!fechaFin) {
      return null;
    }
    const hasta = new Date(`${fechaFin}T00:00:00`);
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return Math.ceil((hasta.getTime() - inicioHoy.getTime()) / 86400000);
  }

  vencimientoClass(item: Contrato): string {
    const dias = this.diasParaVencimiento(item);
    if (dias === null) {
      return 'expiry-none';
    }
    if (dias < 0) {
      return 'expiry-expired';
    }
    if (dias <= 15) {
      return 'expiry-15';
    }
    if (dias <= 30) {
      return 'expiry-30';
    }
    if (dias <= 60) {
      return 'expiry-60';
    }
    return 'expiry-far';
  }

  vencimientoLabel(item: Contrato): string {
    const dias = this.diasParaVencimiento(item);
    if (dias === null) {
      return 'Sin fecha fin';
    }
    if (dias < 0) {
      return `Vencido hace ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`;
    }
    if (dias === 0) {
      return 'Vence hoy';
    }
    return `Fin de contrato en: ${dias} dia${dias === 1 ? '' : 's'}`;
  }

  resumenTexto(value?: string | null, max = 90): string {
    const text = String(value || '').trim();
    if (!text) {
      return '-';
    }
    return text.length > max ? `${text.slice(0, max)}...` : text;
  }

  formatMoney(value?: number | string | null): string {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return '-';
    }
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(amount);
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private emptyContrato(): Contrato {
    return {
      id: null,
      inicio_contrato: new Date().toISOString().slice(0, 10),
      duracion_meses: '',
      contexto: '',
      clausulas_importantes: '',
      monto_contrato: '',
      ofrece_contrato: '',
      contratante: '',
    };
  }
}
