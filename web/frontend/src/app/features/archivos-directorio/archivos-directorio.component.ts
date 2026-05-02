import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArchivoPropiedad, ArchivosPropiedadesData, PropiedadLocal } from './archivos-directorio.models';
import { ArchivosDirectorioService } from './archivos-directorio.service';

@Component({
  selector: 'app-archivos-directorio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archivos-directorio.component.html',
  styleUrl: './archivos-directorio.component.css',
})
export class ArchivosDirectorioComponent implements OnInit {
  loading = signal(false);
  error = signal('');
  ok = signal('');
  data = signal<ArchivosPropiedadesData | null>(null);
  search = '';
  filtroLocal = '';
  propiedadForm: ArchivoPropiedad = this.emptyPropiedad();

  constructor(private readonly archivosService: ArchivosDirectorioService) {}

  ngOnInit(): void {
    this.cargarPropiedades();
  }

  cargarPropiedades(): void {
    this.loading.set(true);
    this.error.set('');
    this.archivosService.listPropiedades({ search: this.search, local: this.filtroLocal }).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo cargar el directorio.');
        this.loading.set(false);
      },
    });
  }

  guardarPropiedad(): void {
    if (!String(this.propiedadForm.cuenta_catastral ?? '').trim() && !String(this.propiedadForm.numero_finca ?? '').trim()) {
      this.error.set('Carga al menos cuenta catastral o numero de finca.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.archivosService.savePropiedad(this.propiedadForm).subscribe({
      next: () => {
        this.ok.set(this.propiedadForm.id ? 'Propiedad actualizada.' : 'Propiedad registrada.');
        this.cancelarEdicion();
        this.cargarPropiedades();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo guardar la propiedad.');
        this.loading.set(false);
      },
    });
  }

  editarPropiedad(item: ArchivoPropiedad): void {
    this.propiedadForm = { ...item, monto: item.monto ?? '' };
    this.error.set('');
    this.ok.set('');
  }

  eliminarPropiedad(item: ArchivoPropiedad): void {
    if (!item.id) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.archivosService.deletePropiedad(item.id).subscribe({
      next: () => {
        this.ok.set('Propiedad eliminada.');
        if (this.propiedadForm.id === item.id) {
          this.cancelarEdicion();
        }
        this.cargarPropiedades();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'No se pudo eliminar la propiedad.');
        this.loading.set(false);
      },
    });
  }

  cancelarEdicion(): void {
    this.propiedadForm = this.emptyPropiedad();
  }

  localLabel(value?: string | null, localOtro?: string | null): string {
    if (value === 'otro') {
      return localOtro || 'Otro';
    }
    const labels: Record<string, string> = {
      luque: 'Luque',
      aregua: 'Aregua',
      itaugua: 'Itaugua',
      limpio: 'Limpio',
    };
    return labels[value || ''] ?? '-';
  }

  formatMoney(value?: number | string | null): string {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return '-';
    }
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(amount);
  }

  formatMonth(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const [year, month] = String(value).split('-');
    if (!year || !month) {
      return '-';
    }
    return `${month}/${year}`;
  }

  private emptyPropiedad(): ArchivoPropiedad {
    return {
      id: null,
      local: 'luque',
      local_otro: '',
      otorgado_por: '',
      a_favor_de: '',
      monto: '',
      cuenta_catastral: '',
      numero_finca: '',
      bibliorato: '',
      mes_anho: '',
      descripcion_ubicacion: '',
      observaciones: '',
    };
  }
}
