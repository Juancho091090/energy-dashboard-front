// src/app/components/analytics/analytics.component.ts

import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { saveAs } from 'file-saver';
import { marked } from 'marked';

import { LecturaEnergiaService } from '../../services/lectura-energia.service';
import { SedeService } from '../../services/sede.service';
import { ConsumoService } from '../../services/consumo-service.service';
import { AnalysisService } from '../../services/analysis.service';
import { Sede } from '../../models/sede.model';
import { ConsumoDia } from '../../models/consumo-dia.model';
import { ConsumoHora } from '../../models/consumo-hora.model';

// Importaciones de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';

// Importar los componentes compartidos
import { NavbarComponent } from '../Shared/navbar/navbar.component';
import { SidebarComponent } from '../Shared/sidebar/sidebar.component';
import { FooterComponent } from '../Shared/footer/footer.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule,
    MatDialogModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
  // Propiedades para el formulario de filtros
  filterForm: FormGroup;

  // Formulario para el análisis con IA
  analysisForm: FormGroup;

  // Propiedades para los datos
  sedes: Sede[] = [];
  consumoData: any[] = [];

  // Estados de la interfaz
  loading = false;
  hasData = false;
  selectedGranularity = 'daily';
  apiResponseTime = 0;

  // Estados de error
  errorSedes = false;
  errorConsumos = false;

  // Propiedades para el análisis IA
  @ViewChild('analysisDialogTemplate') analysisDialogTemplate!: TemplateRef<any>;
  showAnalysisSidebar = false;
  generatingAnalysis = false;
  analysisResult: SafeHtml | null = null;
  rawMarkdown: string | null = null;
  analysisError: string | null = null;
  selectedSedeName: string = '';

  constructor(
    private fb: FormBuilder,
    private lecturaService: LecturaEnergiaService,
    private sedeService: SedeService,
    private consumoService: ConsumoService,
    private analysisService: AnalysisService,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer
  ) {
    // Inicializar el formulario
    this.filterForm = this.fb.group({
      startDate: [new Date(new Date().setDate(new Date().getDate() - 30)), Validators.required],
      endDate: [new Date(), Validators.required],
      sedeId: [''],
      granularity: ['daily', Validators.required]
    });

    // Formulario para el análisis con IA
    this.analysisForm = this.fb.group({
      sedeId: ['', Validators.required],
      startDate: [new Date(new Date().setDate(new Date().getDate() - 30)), Validators.required],
      endDate: [new Date(), Validators.required],
      granularity: ['daily', Validators.required]
    });

    console.log('🚀 Componente de Análisis inicializado - Solo datos reales del backend');
  }

  ngOnInit(): void {
    console.log('🔍 Iniciando carga de datos reales del backend...');
    this.cargarSedes();
  }

  cargarSedes(): void {
    console.log('🔍 Cargando sedes desde el backend...');
    const startTime = performance.now();
    this.errorSedes = false;

    this.sedeService.getSedes().subscribe({
      next: (sedes) => {
        const endTime = performance.now();
        this.apiResponseTime = endTime - startTime;
        this.sedes = sedes;
        console.log(`✅ Sedes cargadas exitosamente: ${sedes.length} sedes encontradas`);
        console.log(`⏱️ Tiempo de respuesta de la API: ${this.apiResponseTime.toFixed(2)}ms`);
      },
      error: (err) => {
        console.error('❌ Error al cargar sedes:', err);
        this.errorSedes = true;
        this.sedes = [];
      }
    });
  }

  onSubmit(): void {
    if (this.filterForm.valid) {
      this.loading = true;
      this.hasData = false;
      this.errorConsumos = false;

      const filters = this.filterForm.value;
      this.selectedGranularity = filters.granularity;

      // Formatear fechas para la API
      const startDate = this.formatDateForAPI(filters.startDate);
      const endDate = this.formatDateForAPI(filters.endDate);

      console.log(`🔍 Consultando datos reales con filtros:
        - Fecha inicio: ${startDate}
        - Fecha fin: ${endDate}
        - Sede ID: ${filters.sedeId || 'Todas'}
        - Granularidad: ${filters.granularity}
      `);

      if (filters.granularity === 'hourly') {
        this.cargarDatosHora(startDate, endDate, filters.sedeId);
      } else {
        this.cargarDatosDia(startDate, endDate, filters.sedeId);
      }
    }
  }

  cargarDatosHora(startDate: string, endDate: string, sedeId?: string): void {
    console.log('🔄 Cargando datos por hora desde el backend...');
    const startTime = performance.now();

    this.consumoService.getConsumosHoraByDateRange(startDate, endDate, sedeId ? +sedeId : undefined).subscribe({
      next: (data) => {
        const endTime = performance.now();
        this.apiResponseTime = endTime - startTime;
        this.consumoData = data;
        this.hasData = data.length > 0;
        this.loading = false;

        console.log(`✅ Datos por hora cargados exitosamente: ${data.length} registros`);
        console.log(`⏱️ Tiempo de respuesta de la API: ${this.apiResponseTime.toFixed(2)}ms`);

        // Enriquecer los datos con los nombres de las sedes
        this.enriquecerConNombresSedes();
      },
      error: (err) => {
        console.error('❌ Error al cargar datos por hora:', err);
        this.loading = false;
        this.errorConsumos = true;
        this.consumoData = [];
        this.hasData = false;
      }
    });
  }

  cargarDatosDia(startDate: string, endDate: string, sedeId?: string): void {
    console.log('🔄 Cargando datos por día desde el backend...');
    const startTime = performance.now();

    this.consumoService.getConsumosDiaByDateRange(startDate, endDate, sedeId ? +sedeId : undefined).subscribe({
      next: (data) => {
        const endTime = performance.now();
        this.apiResponseTime = endTime - startTime;
        this.consumoData = data;
        this.hasData = data.length > 0;
        this.loading = false;

        console.log(`✅ Datos por día cargados exitosamente: ${data.length} registros`);
        console.log(`⏱️ Tiempo de respuesta de la API: ${this.apiResponseTime.toFixed(2)}ms`);

        // Enriquecer los datos con los nombres de las sedes
        this.enriquecerConNombresSedes();
      },
      error: (err) => {
        console.error('❌ Error al cargar datos por día:', err);
        this.loading = false;
        this.errorConsumos = true;
        this.consumoData = [];
        this.hasData = false;
      }
    });
  }

  enriquecerConNombresSedes(): void {
    // Añadir nombres de sedes a los datos de consumo
    this.consumoData.forEach(item => {
      const sede = this.sedes.find(s => s.id === item.id_sede_fk);
      if (sede) {
        item.nombre_sede = sede.nombre_sede;
      }
    });
    console.log('📊 Datos enriquecidos con nombres de sedes');
  }

  resetForm(): void {
    console.log('🔄 Reiniciando formulario y datos');
    this.filterForm.reset({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
      sedeId: '',
      granularity: 'daily'
    });

    this.hasData = false;
    this.consumoData = [];
    this.errorConsumos = false;
  }

  // Recargar datos
  recargarDatos(): void {
    console.log('🔄 Recargando todos los datos...');
    this.cargarSedes();
    if (this.hasData) {
      this.onSubmit();
    }
  }

  // Métodos para gestionar el análisis IA
  openAIAnalysisDialog(): void {
    console.log('🔍 Abriendo diálogo de análisis IA');

    // Verificar que haya sedes disponibles
    if (this.sedes.length === 0) {
      console.error('❌ No hay sedes disponibles para análisis');
      alert('Por favor, cargue las sedes primero antes de solicitar un análisis.');
      return;
    }

    // Restablecer valores del formulario
    this.analysisForm.reset({
      sedeId: '',
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
      granularity: 'daily'
    });

    // Resetear el estado del análisis
    this.analysisError = null;

    // Abrir el diálogo
    const dialogRef = this.dialog.open(this.analysisDialogTemplate, {
      width: '500px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Diálogo cerrado', result);
    });
  }

  generateAIAnalysis(): void {
    if (this.analysisForm.invalid) {
      console.error('❌ Formulario de análisis inválido');
      return;
    }

    // Obtener los valores del formulario
    const formValues = this.analysisForm.value;
    const sedeId = formValues.sedeId;
    const startDate = this.formatDateForAPI(formValues.startDate);
    const endDate = this.formatDateForAPI(formValues.endDate);
    const granularity = formValues.granularity;

    // Encontrar el nombre de la sede seleccionada
    const selectedSede = this.sedes.find(s => s.id === sedeId);
    this.selectedSedeName = selectedSede ? selectedSede.nombre_sede : `Sede #${sedeId}`;

    console.log(`🔍 Solicitando análisis IA REAL para sede "${this.selectedSedeName}" (ID: ${sedeId})`);
    console.log(`Parámetros: inicio=${startDate}, fin=${endDate}, granularidad=${granularity}`);

    // Iniciar estado de carga
    this.generatingAnalysis = true;
    this.analysisResult = null;
    this.rawMarkdown = null;
    this.analysisError = null;
    this.showAnalysisSidebar = true;

    // Cerrar el diálogo
    this.dialog.closeAll();

    console.log('Estado inicial del análisis:', {
      mostrarSeccion: this.showAnalysisSidebar,
      generando: this.generatingAnalysis,
      hayError: !!this.analysisError,
      hayResultado: !!this.analysisResult
    });

    // Llamar al servicio de análisis REAL
    this.analysisService.generateAnalysis(sedeId, startDate, endDate, granularity)
      .subscribe({
        next: (response) => {
          console.log('✅ Análisis IA REAL generado correctamente desde el backend');
          console.log('📄 Longitud del contenido Markdown:', response.length);

          // Verificar que la respuesta no esté vacía
          if (!response || response.trim() === '') {
            console.error('❌ El análisis del backend está vacío');
            this.analysisError = 'El análisis generado está vacío. Por favor, intente de nuevo con diferentes parámetros.';
            this.generatingAnalysis = false;
            return;
          }

          // Guardar el Markdown original para descarga
          this.rawMarkdown = response;

          try {
            // Convertir de Markdown a HTML usando marked
            const htmlContent = marked.parse(response);

            if (typeof htmlContent === 'string') {
              console.log('💡 HTML generado correctamente (modo síncrono)');
              this.analysisResult = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
              this.generatingAnalysis = false;

              console.log('Estado final (síncrono):', {
                mostrarSeccion: this.showAnalysisSidebar,
                generando: this.generatingAnalysis,
                hayError: !!this.analysisError,
                hayResultado: !!this.analysisResult,
                longitudHTML: htmlContent.length
              });
            } else {
              // Es una promesa
              console.log('💡 HTML generado como promesa (modo asíncrono)');
              htmlContent.then(html => {
                this.analysisResult = this.sanitizer.bypassSecurityTrustHtml(html);
                this.generatingAnalysis = false;

                console.log('Estado final (asíncrono):', {
                  mostrarSeccion: this.showAnalysisSidebar,
                  generando: this.generatingAnalysis,
                  hayError: !!this.analysisError,
                  hayResultado: !!this.analysisResult,
                  longitudHTML: html.length
                });
              });
            }
          } catch (error) {
            console.error('❌ Error al procesar Markdown del backend:', error);
            this.analysisError = 'Error al procesar el análisis. Por favor, intente de nuevo.';
            this.generatingAnalysis = false;
          }
        },
        error: (err) => {
          console.error('❌ Error al generar análisis IA desde el backend:', err);

          // Proporcionar mensajes de error más específicos
          let errorMessage = 'No se pudo generar el análisis. ';

          if (err.status === 404) {
            errorMessage += 'El servicio de análisis no está disponible.';
          } else if (err.status === 400) {
            errorMessage += 'Los parámetros proporcionados no son válidos.';
          } else if (err.status === 500) {
            errorMessage += 'Error interno del servidor. Intente más tarde.';
          } else if (err.status === 0) {
            errorMessage += 'No se puede conectar con el servidor.';
          } else {
            errorMessage += 'Intente de nuevo más tarde o seleccione un período diferente.';
          }

          this.analysisError = errorMessage;
          this.generatingAnalysis = false;
        }
      });
  }

  closeAnalysisSidebar(): void {
    console.log('🔒 Cerrando panel de análisis');
    this.showAnalysisSidebar = false;
    this.analysisResult = null;
    this.analysisError = null;
    this.rawMarkdown = null;
  }

  downloadAnalysis(): void {
    if (!this.rawMarkdown) {
      console.error('❌ No hay análisis para descargar');
      return;
    }

    const fecha = new Date().toISOString().split('T')[0];
    const nombreSede = this.selectedSedeName.replace(/\s+/g, '_');
    const filename = `analisis_energia_${nombreSede}_${fecha}.md`;

    // Crear un blob con el contenido Markdown original
    const blob = new Blob([this.rawMarkdown], { type: 'text/markdown;charset=utf-8' });

    // Descargar el archivo
    saveAs(blob, filename);

    console.log(`✅ Análisis descargado como: ${filename}`);
  }

  downloadCSV(): void {
    if (!this.hasData || this.consumoData.length === 0) {
      console.error('❌ No hay datos para descargar');
      alert('No hay datos disponibles para generar el CSV');
      return;
    }

    console.log('📊 Preparando descarga de CSV con datos reales...');

    // Crear encabezado del CSV según la granularidad seleccionada
    let header = this.selectedGranularity === 'hourly' ?
      'Hora,Sede,Consumo Total (kWh),Consumo Promedio (kWh)\n' :
      'Fecha,Sede,Consumo Total (kWh),Consumo Promedio (kWh)\n';

    let csv = header;

    // Agregar datos al CSV
    this.consumoData.forEach(item => {
      const fecha = this.selectedGranularity === 'hourly' ?
        this.formatDate(item.hora_inicio_utc) :
        this.formatDate(item.fecha_utc);

      const sede = item.nombre_sede || `Sede #${item.id_sede_fk}`;
      const consumoTotal = (item.consumo_total_kwh || item.consumo_total_diario_kwh || 0).toFixed(2);
      const consumoPromedio = this.selectedGranularity === 'hourly' ?
        (item.consumo_promedio_kwh || 0).toFixed(2) :
        (item.consumo_promedio_horario_kwh || 0).toFixed(2);

      csv += `"${fecha}","${sede}",${consumoTotal},${consumoPromedio}\n`;
    });

    // Crear blob y descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const filename = `consumo-energia-${this.selectedGranularity}-${new Date().toISOString().split('T')[0]}.csv`;

    // Crear elemento de descarga
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ Archivo CSV con datos reales generado y descargado exitosamente');
  }

  // Verificar si hay datos disponibles
  hasRealData(): boolean {
    return this.hasData && this.consumoData.length > 0;
  }

  // Verificar si está cargando
  isLoading(): boolean {
    return this.loading;
  }

  // Verificar si hay errores
  hasErrors(): boolean {
    return this.errorSedes || this.errorConsumos;
  }

  // Métodos de utilidad para formateo
  formatDate(dateStr: string): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);

    if (this.selectedGranularity === 'hourly') {
      return `${date.toLocaleDateString('es-CO')} ${date.getHours()}:00`;
    } else {
      return date.toLocaleDateString('es-CO');
    }
  }

  formatDateDisplay(date: Date): string {
    if (!date) return '';
    return date.toLocaleDateString('es-CO');
  }

  formatChartLabel(item: any): string {
    if (this.selectedGranularity === 'hourly') {
      const date = new Date(item.hora_inicio_utc);
      return `${date.getHours()}:00`;
    } else {
      const date = new Date(item.fecha_utc);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }
  }

  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Método para calcular la altura de las barras en el gráfico
  getBarHeight(item: any): number {
    const maxConsumo = this.getMaxConsumo();
    const consumo = item.consumo_total_kwh || item.consumo_total_diario_kwh || 0;

    if (maxConsumo <= 0) return 0;

    const percentage = (consumo / maxConsumo) * 100;
    // Asegurar una altura mínima visible para valores muy pequeños
    return percentage < 3 && percentage > 0 ? 3 : percentage;
  }

  // Obtener el consumo máximo para el cálculo de las barras
  getMaxConsumo(): number {
    if (!this.consumoData || this.consumoData.length === 0) return 1;

    return Math.max(...this.consumoData.map(item =>
      item.consumo_total_kwh || item.consumo_total_diario_kwh || 0
    )) || 1; // Para evitar división por cero
  }

  // Obtener el consumo total
  getTotalConsumo(): number {
    if (!this.consumoData || this.consumoData.length === 0) return 0;

    return this.consumoData.reduce((total, item) =>
      total + (item.consumo_total_kwh || item.consumo_total_diario_kwh || 0), 0);
  }

  // Obtener el consumo promedio
  getPromedioConsumo(): number {
    if (!this.consumoData || this.consumoData.length === 0) return 0;

    const total = this.getTotalConsumo();
    return total / this.consumoData.length;
  }

  // Formatear números con 2 decimales
  formatNumber(value: number): string {
    return value.toFixed(2);
  }
}
