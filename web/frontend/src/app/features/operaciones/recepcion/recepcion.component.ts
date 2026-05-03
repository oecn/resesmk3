import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RecepcionData, RecepcionDistribucion, RecepcionMenudencia, RecepcionSucursalSlug } from './recepcion.models';
import { RecepcionService } from './recepcion.service';
import { FmtNumberPipe } from '../../../shared/pipes/fmt-number.pipe';

@Component({
  selector: 'app-recepcion',
  standalone: true,
  imports: [CommonModule, FormsModule, FmtNumberPipe],
  templateUrl: './recepcion.component.html',
  styleUrl: './recepcion.component.css',
})
export class RecepcionComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly recepcionService = inject(RecepcionService);
  currentUser = this.authService.currentUser;
  @ViewChild('recepcionKgInput') recepcionKgInput?: ElementRef<HTMLInputElement>;

  recepcionSucursal: RecepcionSucursalSlug = 'itaugua';
  sucursalesRecepcion: Array<{ slug: RecepcionSucursalSlug; nombre: string }> = [
    { slug: 'itaugua', nombre: 'Itaugua' },
    { slug: 'luque', nombre: 'Luque' },
    { slug: 'aregua', nombre: 'Aregua' },
  ];
  recepcionFecha = new Date().toISOString().slice(0, 10);
  recepcionBusqueda = '';
  menuBusqueda = '';
  seleccionadoId: number | null = null;
  recepcionKg = '';
  recepcionFaltante = '';
  recepcionSobrante = '';
  recepcionRegistradoPor = '';
  recepcionNota = '';
  nuevoProducto = '';
  nuevoKg = '';
  nuevoUnidades = '';
  recepcionLoading = signal(false);
  recepcionError = signal('');
  recepcionOk = signal('');
  recepcion = signal<RecepcionData | null>(null);

  recepcionSucursalBloqueada = computed(() => {
    const user = this.currentUser();
    return user?.rol === 'recepcion' ? (user.sucursal_permitida ?? null) : null;
  });

  canEditMenudencias = computed(() => {
    const role = this.currentUser()?.rol;
    return role === 'admin' || role === 'supervisor';
  });

  distribucionesFiltradas = computed(() => {
    const term = this.recepcionBusqueda.trim().toLowerCase();
    const rows = this.recepcion()?.distribuciones ?? [];
    if (!term) {
      return rows;
    }
    return rows.filter((row) =>
      [row.fecha, row.lote, row.origen, row.nota].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    );
  });

  ngOnInit(): void {
    const blocked = this.recepcionSucursalBloqueada();
    if (blocked) {
      this.recepcionSucursal = blocked;
    }
    this.cargarRecepcion();
  }

  menudenciasFiltradas(): RecepcionMenudencia[] {
    const term = this.menuBusqueda.trim().toLowerCase();
    const rows = this.recepcion()?.menudencias ?? [];
    if (!term) {
      return rows;
    }
    return rows.filter((row) => row.producto.toLowerCase().includes(term));
  }

  private syncRecepcionScopeFromUser(): void {
    const blocked = this.recepcionSucursalBloqueada();
    if (blocked) {
      this.recepcionSucursal = blocked;
    }
  }
  cargarRecepcion(): void {
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.recepcionService.getRecepcion(this.recepcionSucursal, this.recepcionFecha).subscribe({
      next: (data) => {
        this.recepcion.set(data);
        this.recepcionLoading.set(false);
        if (this.seleccionadoId) {
          const selected = data.distribuciones.find((row) => row.id === this.seleccionadoId);
          if (selected) {
            this.seleccionarDistribucion(selected);
          }
        }
      },
      error: (err) => {
        this.recepcionError.set(err?.error?.error ?? 'No se pudo cargar la recepcion.');
        this.recepcionLoading.set(false);
      },
    });
  }

  private async extractHttpBlobError(err: unknown, fallback: string): Promise<string> {
    const blob = (err as { error?: unknown } | null)?.error;
    if (!(blob instanceof Blob)) {
      return (err as { error?: { error?: string } } | null)?.error?.error ?? fallback;
    }
    try {
      const text = await blob.text();
      if (!text) {
        return fallback;
      }
      const parsed = JSON.parse(text) as { error?: string };
      return parsed?.error || fallback;
    } catch {
      return fallback;
    }
  }

  abrirReporteRecepcionPdf(): void {
    const rec = this.recepcion();
    if (!rec) {
      this.recepcionError.set('No hay datos de recepcion para generar el reporte.');
      return;
    }
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.recepcionService.getRecepcionPdf(this.recepcionSucursal, this.recepcionFecha).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank');
        if (!opened) {
          this.recepcionError.set('El navegador bloqueo la apertura del PDF. Permiti ventanas emergentes para este sitio.');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.recepcionLoading.set(false);
      },
      error: async (err) => {
        this.recepcionError.set(await this.extractHttpBlobError(err, 'No se pudo generar el PDF de recepcion.'));
        this.recepcionLoading.set(false);
      },
    });
  }

  cambiarSucursalRecepcion(): void {
    if (this.recepcionSucursalBloqueada()) {
      this.syncRecepcionScopeFromUser();
      return;
    }
    this.seleccionadoId = null;
    this.recepcionKg = '';
    this.recepcionFaltante = '';
    this.recepcionSobrante = '';
    this.recepcionNota = '';
    this.recepcionBusqueda = '';
    this.menuBusqueda = '';
    this.cargarRecepcion();
  }

  seleccionarDistribucion(row: RecepcionDistribucion): void {
    this.seleccionadoId = row.id;
    this.recepcionKg = String(Number(row.kg || 0).toFixed(2));
    this.recepcionFaltante = Number(row.diferencia_kg) < 0 ? String(Math.abs(Number(row.diferencia_kg)).toFixed(2)) : '';
    this.recepcionSobrante = Number(row.diferencia_kg) > 0 ? String(Number(row.diferencia_kg).toFixed(2)) : '';
    this.recepcionNota = row.nota ?? '';
    this.focusRecepcionKgInput();
  }

  private focusRecepcionKgInput(): void {
    setTimeout(() => {
      const input = this.recepcionKgInput?.nativeElement;
      if (!input) {
        return;
      }
      input.focus();
      input.select();
    });
  }

  guardarRecepcionKg(): void {
    if (!this.seleccionadoId) {
      this.recepcionError.set('Elegi una distribucion de la lista.');
      return;
    }
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.recepcionService
      .updateRecepcionDistribucion(this.recepcionSucursal, {
        id: this.seleccionadoId,
        kg: this.recepcionKg,
        faltante_kg: this.recepcionFaltante,
        sobrante_kg: this.recepcionSobrante,
        registrado_por: this.recepcionRegistradoPor,
        nota: this.recepcionNota,
      })
      .subscribe({
        next: () => {
          this.recepcionOk.set('Kg recibido actualizado.');
          this.cargarRecepcion();
          },
        error: (err) => {
          this.recepcionError.set(err?.error?.error ?? 'No se pudo actualizar el kg.');
          this.recepcionLoading.set(false);
        },
      });
  }

  agregarMenudencia(): void {
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.recepcionService
      .addMenudencia(this.recepcionSucursal, {
        fecha: this.recepcionFecha,
        producto: this.nuevoProducto,
        kg: this.nuevoKg,
        unidades: this.nuevoUnidades,
      })
      .subscribe({
        next: () => {
          this.nuevoProducto = '';
          this.nuevoKg = '';
          this.nuevoUnidades = '';
          this.recepcionOk.set('Menudencia agregada.');
          this.cargarRecepcion();
          },
        error: (err) => {
          this.recepcionError.set(err?.error?.error ?? 'No se pudo guardar la menudencia.');
          this.recepcionLoading.set(false);
        },
      });
  }

  actualizarMenudencia(row: RecepcionMenudencia): void {
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.recepcionService.updateMenudencia(this.recepcionSucursal, row).subscribe({
      next: () => {
        this.recepcionOk.set('Menudencia actualizada.');
        this.cargarRecepcion();
      },
      error: (err) => {
        this.recepcionError.set(err?.error?.error ?? 'No se pudo actualizar la menudencia.');
        this.recepcionLoading.set(false);
      },
    });
  }

  guardarTodasMenudencias(): void {
    const rows = this.recepcion()?.menudencias ?? [];
    if (rows.length === 0) {
      return;
    }
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    forkJoin(rows.map((row) => this.recepcionService.updateMenudencia(this.recepcionSucursal, row))).subscribe({
      next: () => {
        this.recepcionOk.set('Todas las menudencias guardadas.');
        this.cargarRecepcion();
      },
      error: (err) => {
        this.recepcionError.set(err?.error?.error ?? 'No se pudieron guardar todas las menudencias.');
        this.recepcionLoading.set(false);
      },
    });
  }

  eliminarMenudencia(row: RecepcionMenudencia): void {
    const ok = window.confirm(`Eliminar ${row.producto}?`);
    if (!ok) {
      return;
    }
    this.recepcionLoading.set(true);
    this.recepcionError.set('');
    this.recepcionOk.set('');
    this.recepcionService.deleteMenudencia(this.recepcionSucursal, row.id).subscribe({
      next: () => {
        this.recepcionOk.set('Menudencia eliminada.');
        this.cargarRecepcion();
      },
      error: (err) => {
        this.recepcionError.set(err?.error?.error ?? 'No se pudo eliminar la menudencia.');
        this.recepcionLoading.set(false);
      },
    });
  }

}
