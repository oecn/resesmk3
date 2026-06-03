import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcuerdoCobranza, AcuerdosCobranzasAnualResponse, AcuerdosCobranzasResponse } from '../../acuerdos-comerciales.models';
import { AcuerdosComercialesService } from '../../acuerdos-comerciales.service';

interface CobranzaGrupo {
  key: number;
  proveedor_nombre: string;
  titulo: string;
  alquiler?: AcuerdoCobranza;
  porcentaje?: AcuerdoCobranza;
  ambos?: AcuerdoCobranza;
}

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
  expanded = signal<Set<string>>(new Set());
  expandedGroups = signal<Set<number>>(new Set());
  totales = signal<AcuerdosCobranzasResponse['totales'] | null>(null);
  loading = signal(false);
  savingId = signal<string | null>(null);
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
  readonly tiposFacturacion = [
    { value: 'alquiler', label: 'Alquiler' },
    { value: 'porcentaje_venta', label: '% venta' },
    { value: 'ambos', label: 'Cobrado ambos' },
  ] as const;

  periodoLabel = computed(() => new Intl.DateTimeFormat('es-PY', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(this.anho, this.mes - 1, 1)));
  cobranzaGrupos = computed<CobranzaGrupo[]>(() => {
    const grupos = new Map<number, CobranzaGrupo>();
    for (const item of this.items()) {
      const grupo = grupos.get(item.acuerdo_id) ?? {
        key: item.acuerdo_id,
        proveedor_nombre: item.proveedor_nombre,
        titulo: item.titulo,
      };
      if (item.tipo_facturacion === 'ambos') {
        grupo.ambos = item;
      } else if (item.tipo_facturacion === 'porcentaje_venta') {
        grupo.porcentaje = item;
      } else {
        grupo.alquiler = item;
      }
      grupos.set(item.acuerdo_id, grupo);
    }
    return [...grupos.values()];
  });

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
        this.expandedGroups.set(new Set());
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
    const key = this.rowKey(item);
    this.savingId.set(key);
    this.error.set('');
    this.ok.set('');
    this.acuerdosService.saveCobranza({
      acuerdo_id: item.acuerdo_id,
      periodo_mes: this.mes,
      periodo_anho: this.anho,
      tipo_facturacion: item.tipo_facturacion || 'alquiler',
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
          this.rowKey(row) === key
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

  toggleDetalle(item: AcuerdoCobranza): void {
    const key = this.rowKey(item);
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isExpanded(item: AcuerdoCobranza): boolean {
    return this.expanded().has(this.rowKey(item));
  }

  toggleGrupo(grupo: CobranzaGrupo): void {
    this.expandedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(grupo.key)) {
        next.delete(grupo.key);
      } else {
        next.add(grupo.key);
      }
      return next;
    });
  }

  isGrupoExpanded(grupo: CobranzaGrupo): boolean {
    return this.expandedGroups().has(grupo.key);
  }

  rowKey(item: AcuerdoCobranza): string {
    return `${item.acuerdo_id}-${item.id ?? item.tipo_facturacion ?? 'nuevo'}`;
  }

  inputKey(item: AcuerdoCobranza): string {
    return `${item.acuerdo_id}-${item.id ?? item.tipo_facturacion ?? 'nuevo'}`;
  }

  tipoFacturacionLabel(item: AcuerdoCobranza): string {
    return this.tiposFacturacion.find((tipo) => tipo.value === item.tipo_facturacion)?.label ?? 'Alquiler';
  }

  grupoBaseItem(grupo: CobranzaGrupo): AcuerdoCobranza {
    return grupo.ambos ?? grupo.alquiler ?? grupo.porcentaje!;
  }

  grupoStatus(grupo: CobranzaGrupo): string {
    if (grupo.ambos?.cobrado) {
      return 'Cobrado ambos';
    }
    const cobradas = [grupo.alquiler, grupo.porcentaje].filter((item) => item?.cobrado).length;
    if (cobradas === 2) {
      return 'Cobrado';
    }
    if (cobradas === 1) {
      return 'Parcial';
    }
    return 'Pendiente';
  }

  grupoMonto(grupo: CobranzaGrupo): number {
    if (grupo.ambos) {
      return Number(grupo.ambos.monto_factura) || 0;
    }
    return Number(grupo.alquiler?.monto_factura || 0) + Number(grupo.porcentaje?.monto_factura || 0);
  }

  grupoCobradas(grupo: CobranzaGrupo): number {
    if (grupo.ambos?.cobrado) {
      return 2;
    }
    return [grupo.alquiler, grupo.porcentaje].filter((item) => item?.cobrado).length;
  }

  grupoStatusClass(grupo: CobranzaGrupo): string {
    const cobradas = this.grupoCobradas(grupo);
    if (cobradas >= 2) {
      return 'paid';
    }
    if (cobradas === 1) {
      return 'partial';
    }
    return 'unpaid';
  }

  conceptoFacturaLabel(item?: AcuerdoCobranza): string {
    return item?.numero_factura || 'Sin factura';
  }

  marcarCobradoAmbos(item: AcuerdoCobranza): void {
    item.tipo_facturacion = 'ambos';
    item.cobrado = true;
    this.toggleCobrado(item);
    this.expanded.update((current) => new Set([...current, this.rowKey(item)]));
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
