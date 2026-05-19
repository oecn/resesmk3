import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcuerdoCobranza, AcuerdosCobranzasAnualResponse, AcuerdosCobranzasResponse } from '../../acuerdos-comerciales.models';
import { AcuerdosComercialesService } from '../../acuerdos-comerciales.service';

@Component({
  selector: 'app-acuerdos-cobranzas-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cobranzas-panel.component.html',
  styleUrl: './cobranzas-panel.component.css',
})
export class CobranzasPanelComponent implements OnInit {
  private readonly today = new Date();

  mes = this.today.getMonth() + 1;
  anho = this.today.getFullYear();
  vista: 'mensual' | 'anual' = 'mensual';
  items = signal<AcuerdoCobranza[]>([]);
  anual = signal<AcuerdosCobranzasAnualResponse | null>(null);
  expanded = signal<Set<number>>(new Set());
  totales = signal<AcuerdosCobranzasResponse['totales'] | null>(null);
  loading = signal(false);
  savingId = signal<number | null>(null);
  error = signal('');
  ok = signal('');
  readonly formasCobro = [
    { value: '', label: 'Sin definir' },
    { value: 'factura_canje', label: 'Factura-canje' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'otro', label: 'Otro' },
  ];

  periodoLabel = computed(() => new Intl.DateTimeFormat('es-PY', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(this.anho, this.mes - 1, 1)));

  constructor(private readonly acuerdosService: AcuerdosComercialesService) {}

  ngOnInit(): void {
    this.cargarCobranzas();
  }

  cargarCobranzas(): void {
    if (this.vista === 'anual') {
      this.cargarCobranzasAnual();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.listCobranzas(this.mes, this.anho).subscribe({
      next: (data) => {
        this.items.set(data.items.map((item) => ({ ...item })));
        this.expanded.set(new Set());
        this.totales.set(data.totales);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar la cobranza de acuerdos.');
        this.loading.set(false);
      },
    });
  }

  cargarCobranzasAnual(): void {
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.listCobranzasAnual(this.anho).subscribe({
      next: (data) => {
        this.anual.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar la vista anual.');
        this.loading.set(false);
      },
    });
  }

  cambiarVista(vista: 'mensual' | 'anual'): void {
    this.vista = vista;
    this.cargarCobranzas();
  }

  cambiarMes(offset: number): void {
    if (this.vista === 'anual') {
      this.anho += offset;
      this.cargarCobranzasAnual();
      return;
    }
    const next = new Date(this.anho, this.mes - 1, 1);
    next.setMonth(next.getMonth() + offset);
    this.mes = next.getMonth() + 1;
    this.anho = next.getFullYear();
    this.cargarCobranzas();
  }

  actualizarPeriodoDesdeFecha(value: string): void {
    if (!value) {
      return;
    }
    const selected = new Date(`${value}T00:00:00`);
    if (Number.isNaN(selected.getTime())) {
      return;
    }
    this.mes = selected.getMonth() + 1;
    this.anho = selected.getFullYear();
    this.cargarCobranzas();
  }

  periodoInputValue(): string {
    return `${this.anho}-${String(this.mes).padStart(2, '0')}-01`;
  }

  guardarCobranza(item: AcuerdoCobranza): void {
    this.savingId.set(item.acuerdo_id);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.saveCobranza({
      acuerdo_id: item.acuerdo_id,
      periodo_mes: this.mes,
      periodo_anho: this.anho,
      numero_factura: item.numero_factura,
      monto_factura: item.monto_factura,
      fecha_factura: item.fecha_factura || null,
      cobrado: item.cobrado,
      fecha_cobro: item.fecha_cobro || null,
      forma_cobro: item.forma_cobro || null,
      observaciones: item.observaciones || '',
    }).subscribe({
      next: (saved) => {
        this.items.update((rows) => rows.map((row) => (
          row.acuerdo_id === item.acuerdo_id
            ? { ...row, ...saved, proveedor_nombre: row.proveedor_nombre, proveedor_ruc: row.proveedor_ruc, titulo: row.titulo }
            : row
        )));
        this.ok.set('Cobranza guardada.');
        this.savingId.set(null);
        this.cargarCobranzas();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar la cobranza.');
        this.savingId.set(null);
      },
    });
  }

  toggleDetalle(acuerdoId: number): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(acuerdoId)) {
        next.delete(acuerdoId);
      } else {
        next.add(acuerdoId);
      }
      return next;
    });
  }

  isExpanded(acuerdoId: number): boolean {
    return this.expanded().has(acuerdoId);
  }

  toggleCobrado(item: AcuerdoCobranza): void {
    if (item.cobrado && !item.fecha_cobro) {
      item.fecha_cobro = new Date().toISOString().slice(0, 10);
      return;
    }
    if (!item.cobrado) {
      item.fecha_cobro = null;
    }
  }

  money(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  mesNombre(mes: number): string {
    return new Intl.DateTimeFormat('es-PY', { month: 'short' }).format(new Date(this.anho, mes - 1, 1));
  }

  proveedorMes(proveedor: AcuerdosCobranzasAnualResponse['proveedores'][number], mes: number) {
    return proveedor.meses.find((item) => item.mes === mes);
  }
}
