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
  private readonly columnasStorageKey = 'contratos_columnas_visibles';
  loading = signal(false);
  error = signal('');
  ok = signal('');
  data = signal<ContratosResponse | null>(null);
  clausulasPopup = signal<Contrato | null>(null);
  contextoPopup = signal<Contrato | null>(null);
  columnasPopup = signal(false);
  search = '';
  seccionActiva = 'todos';
  contratoForm: Contrato = this.emptyContrato();
  columnasVisibles = new Set<string>([
    'inicio',
    'documento',
    'vencimiento',
    'entidad',
    'contraparte',
    'sucursal',
    'bibliorato',
    'clausulas',
  ]);
  readonly columnasTabla = [
    { key: 'inicio', label: 'Inicio' },
    { key: 'fin', label: 'Fin' },
    { key: 'documento', label: 'Documento' },
    { key: 'vencimiento', label: 'Vencimiento' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'naturaleza', label: 'Naturaleza' },
    { key: 'entidad', label: 'Entidad / comprador' },
    { key: 'contraparte', label: 'Contraparte / vendedor' },
    { key: 'sucursal', label: 'Sucursal' },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'catastro', label: 'Catastro' },
    { key: 'finca', label: 'Finca' },
    { key: 'bibliorato', label: 'Bibliorato' },
    { key: 'medio', label: 'Radio / medio' },
    { key: 'programa', label: 'Programa' },
    { key: 'contexto', label: 'Contexto' },
    { key: 'clausulas', label: 'Clausulas / info' },
  ];
  readonly secciones = [
    { value: 'nuevo', label: 'Nuevo contrato' },
    { value: 'todos', label: 'Todos' },
    { value: 'contratos', label: 'Contratos' },
    { value: 'terrenos', label: 'Terrenos' },
    { value: 'publicidad', label: 'Publicidad' },
    { value: 'permisos', label: 'Permisos y certificados' },
    { value: 'archivo', label: 'Archivo documental' },
  ];
  readonly tiposDocumento = [
    { value: 'contrato', label: 'Contrato' },
    { value: 'permiso', label: 'Permiso' },
    { value: 'certificado', label: 'Certificado' },
    { value: 'habilitacion', label: 'Habilitacion' },
    { value: 'documento_legal', label: 'Documento legal' },
  ];
  readonly categorias = [
    { value: 'alquiler', label: 'Alquiler' },
    { value: 'publicidad_radial', label: 'Publicidad radial' },
    { value: 'publicidad_television', label: 'Publicidad television' },
    { value: 'publicidad_redes', label: 'Publicidad redes sociales' },
    { value: 'publicidad_carteleria', label: 'Carteleria / via publica' },
    { value: 'sponsoreo_deportivo', label: 'Sponsoreo deportivo' },
    { value: 'servicios_personales', label: 'Servicios personales' },
    { value: 'servicios_tercerizados', label: 'Servicios tercerizados' },
    { value: 'compra_terreno', label: 'Compra de terreno' },
    { value: 'compra_vehiculo', label: 'Compra de vehiculo' },
    { value: 'mades', label: 'MADES / medioambiental' },
    { value: 'manipulacion_alimentos', label: 'Manipulacion de alimentos' },
    { value: 'certificado_alimentos', label: 'Certificado de alimentos' },
    { value: 'habilitacion_municipal', label: 'Habilitacion municipal' },
    { value: 'autorizaciones', label: 'Autorizaciones' },
    { value: 'general', label: 'General' },
  ];
  readonly estadosDocumento = [
    { value: 'vigente', label: 'Vigente' },
    { value: 'por_vencer', label: 'Por vencer' },
    { value: 'vencido', label: 'Vencido' },
    { value: 'en_renovacion', label: 'En renovacion' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'no_renovable', label: 'No renovable' },
    { value: 'finalizado', label: 'Finalizado' },
  ];
  readonly naturalezaPorCategoria: Record<string, string> = {
    alquiler: 'Inmobiliaria / Legal',
    publicidad_radial: 'Comercial / Publicidad',
    publicidad_television: 'Comercial / Publicidad',
    publicidad_redes: 'Comercial / Publicidad',
    publicidad_carteleria: 'Comercial / Publicidad',
    sponsoreo_deportivo: 'Comercial / Publicidad',
    servicios_personales: 'Laboral / Servicio',
    servicios_tercerizados: 'Operativa / Servicio',
    compra_terreno: 'Inmobiliaria / Legal',
    compra_vehiculo: 'Patrimonial / Legal',
    mades: 'Medioambiental / Legal',
    manipulacion_alimentos: 'Sanitaria / Operativa',
    certificado_alimentos: 'Sanitaria / Operativa',
    habilitacion_municipal: 'Legal / Operativa',
    autorizaciones: 'Legal / Autorizacion',
    general: 'General',
  };

  constructor(private readonly contratosService: ContratosService) {}

  ngOnInit(): void {
    this.cargarColumnasVisibles();
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
      this.error.set('Inicio, entidad relacionada y contraparte son obligatorios.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.ok.set('');
    this.contratoForm.naturaleza = this.naturalezaCalculada();
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
    this.seccionActiva = 'nuevo';
    if (!this.contratoForm.fecha_fin) {
      this.actualizarFechaFinPorDuracion();
    }
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
    if (item.fecha_fin) {
      return item.fecha_fin;
    }
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

  actualizarFechaFinPorDuracion(): void {
    const calculada = this.calcularFechaFinPorDuracion(this.contratoForm.inicio_contrato, this.contratoForm.duracion_meses);
    if (calculada) {
      this.contratoForm.fecha_fin = calculada;
    }
  }

  calcularFechaFinPorDuracion(inicio?: string | null, duracion?: number | string | null): string {
    const meses = Number(duracion) || 0;
    if (!inicio || meses <= 0) {
      return '';
    }
    const desde = new Date(`${inicio}T00:00:00`);
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

  tipoDocumentoLabel(value?: string | null): string {
    return this.tiposDocumento.find((item) => item.value === value)?.label ?? (value || '-');
  }

  categoriaLabel(value?: string | null): string {
    return this.categorias.find((item) => item.value === value)?.label ?? (value || '-');
  }

  ciudadClass(value?: string | null): string {
    const ciudad = String(value || '').trim().toLowerCase();
    if (ciudad.includes('luque')) {
      return 'city-luque';
    }
    if (ciudad.includes('aregua') || ciudad.includes('aregu')) {
      return 'city-aregua';
    }
    if (ciudad.includes('itaugua') || ciudad.includes('itaugu')) {
      return 'city-itaugua';
    }
    if (ciudad.includes('limpio')) {
      return 'city-limpio';
    }
    return 'city-default';
  }

  estadoDocumentoLabel(value?: string | null): string {
    return this.estadosDocumento.find((item) => item.value === value)?.label ?? (value || '-');
  }

  columnaDisponible(key: string): boolean {
    if (key === 'vencimiento') {
      return this.seccionActiva !== 'terrenos';
    }
    if (['ciudad', 'catastro', 'finca', 'contexto'].includes(key)) {
      return this.seccionActiva !== 'publicidad';
    }
    if (['medio', 'programa'].includes(key)) {
      return this.seccionActiva === 'publicidad';
    }
    return true;
  }

  mostrarColumna(key: string): boolean {
    return this.columnaDisponible(key) && this.columnasVisibles.has(key);
  }

  toggleColumna(key: string, visible: boolean): void {
    if (visible) {
      this.columnasVisibles.add(key);
    } else {
      this.columnasVisibles.delete(key);
    }
    this.guardarColumnasVisibles();
  }

  abrirColumnasPopup(): void {
    this.columnasPopup.set(true);
  }

  cerrarColumnasPopup(): void {
    this.columnasPopup.set(false);
  }

  columnasColspan(): number {
    return this.columnasTabla.filter((column) => this.mostrarColumna(column.key)).length + 1;
  }

  itemsFiltrados(): Contrato[] {
    const items = this.data()?.items ?? [];
    if (this.seccionActiva === 'todos' || this.seccionActiva === 'nuevo') {
      return items;
    }
    if (this.seccionActiva === 'terrenos') {
      return this.terrenosItems();
    }
    if (this.seccionActiva === 'publicidad') {
      return items.filter((item) => this.esPublicidadItem(item));
    }
    if (this.seccionActiva === 'permisos') {
      return items.filter((item) => this.esPermisoItem(item));
    }
    if (this.seccionActiva === 'archivo') {
      return items.filter((item) => item.bibliorato || item.archivo_url);
    }
    return items.filter((item) => !this.esPublicidadItem(item) && !this.esPermisoItem(item) && item.categoria !== 'compra_terreno');
  }

  terrenosItems(): Contrato[] {
    return (this.data()?.items ?? []).filter((item) => item.categoria === 'compra_terreno');
  }

  cambiarSeccion(seccion: string): void {
    this.seccionActiva = seccion;
  }

  seccionActivaLabel(): string {
    return this.secciones.find((item) => item.value === this.seccionActiva)?.label ?? 'Todos';
  }

  naturalezaCalculada(item: Contrato = this.contratoForm): string {
    return this.naturalezaPorCategoria[String(item.categoria || 'general')] ?? 'General';
  }

  esPublicidadItem(item: Contrato): boolean {
    const categoria = String(item.categoria || '');
    return categoria.startsWith('publicidad_') || categoria === 'sponsoreo_deportivo';
  }

  esPermisoItem(item: Contrato): boolean {
    return ['permiso', 'certificado', 'habilitacion'].includes(String(item.tipo_documento || ''))
      || ['mades', 'manipulacion_alimentos', 'certificado_alimentos', 'habilitacion_municipal', 'autorizaciones'].includes(String(item.categoria || ''));
  }

  esCategoriaPublicidad(): boolean {
    return String(this.contratoForm.categoria || '').startsWith('publicidad_') || this.contratoForm.categoria === 'sponsoreo_deportivo';
  }

  esPublicidadTelevision(): boolean {
    return this.contratoForm.categoria === 'publicidad_television';
  }

  esSponsoreo(): boolean {
    return this.contratoForm.categoria === 'sponsoreo_deportivo';
  }

  esTerreno(): boolean {
    return this.contratoForm.categoria === 'compra_terreno';
  }

  esFormularioGeneral(): boolean {
    return !this.esCategoriaPublicidad() && !this.esTerreno();
  }

  esVehiculo(): boolean {
    return this.contratoForm.categoria === 'compra_vehiculo';
  }

  esPermisoOCertificado(): boolean {
    return ['permiso', 'certificado', 'habilitacion'].includes(String(this.contratoForm.tipo_documento || ''));
  }

  private cargarColumnasVisibles(): void {
    try {
      const raw = localStorage.getItem(this.columnasStorageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.columnasVisibles = new Set(parsed.filter((key) => this.columnasTabla.some((column) => column.key === key)));
      }
    } catch {
      this.columnasVisibles = new Set(this.columnasVisibles);
    }
  }

  private guardarColumnasVisibles(): void {
    localStorage.setItem(this.columnasStorageKey, JSON.stringify(Array.from(this.columnasVisibles)));
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
      nombre_documento: '',
      tipo_documento: 'contrato',
      categoria: 'general',
      naturaleza: '',
      sucursal: '',
      entidad_relacionada: '',
      responsable_interno: '',
      estado_documento: 'vigente',
      inicio_contrato: new Date().toISOString().slice(0, 10),
      fecha_fin: '',
      duracion_meses: '',
      contexto: '',
      clausulas_importantes: '',
      monto_contrato: '',
      ofrece_contrato: '',
      contratante: '',
      archivo_url: '',
      bibliorato: '',
      localidad: '',
      cuenta_catastral: '',
      finca_matricula: '',
      superficie: '',
      distrito: '',
      departamento: '',
      marca: '',
      modelo: '',
      anho_vehiculo: '',
      chapa: '',
      chasis: '',
      motor: '',
      estado_transferencia: '',
      medio_publicidad: '',
      programa_publicidad: '',
      horario_publicidad: '',
      frecuencia_publicidad: '',
      club_equipo: '',
      ubicacion_marca: '',
      beneficios_pactados: '',
      entidad_emisora: '',
      numero_documento: '',
    };
  }
}
