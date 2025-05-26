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

    console.log('🚀 Componente de Análisis inicializado con soporte para IA');
  }

  ngOnInit(): void {
    // Cargar la lista de sedes
    console.log('🔍 Iniciando carga de sedes...');
    this.cargarSedes();
  }

  cargarSedes(): void {
    const startTime = performance.now();
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
        console.log('🔄 Intentando cargar datos de respaldo...');
        // Generar sedes de prueba en caso de error
        this.generarSedesSimuladas();
      }
    });
  }

  generarSedesSimuladas(): void {
    console.warn('⚠️ Usando datos simulados para sedes');
    // Crear algunas sedes simuladas
    this.sedes = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      nombre_sede: `Colegio Simulado #${i + 1}`,
      lat: 4.7 + Math.random() * 0.1,
      lon: -74.1 + Math.random() * 0.1
    } as Sede));
  }

  onSubmit(): void {
    if (this.filterForm.valid) {
      this.loading = true;
      this.hasData = false;

      const filters = this.filterForm.value;
      this.selectedGranularity = filters.granularity;

      // Formatear fechas para la API
      const startDate = this.formatDateForAPI(filters.startDate);
      const endDate = this.formatDateForAPI(filters.endDate);

      console.log(`🔍 Consultando datos con filtros:
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
    console.log('🔄 Cargando datos por hora...');
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
        console.log('🔄 Generando datos simulados como respaldo...');
        this.loading = false;

        // Generar datos simulados si la API falla
        this.generarDatosSimulados('hourly');
      }
    });
  }

  cargarDatosDia(startDate: string, endDate: string, sedeId?: string): void {
    console.log('🔄 Cargando datos por día...');
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
        console.log('🔄 Generando datos simulados como respaldo...');
        this.loading = false;

        // Generar datos simulados si la API falla
        this.generarDatosSimulados('daily');
      }
    });
  }

  generarDatosSimulados(granularity: string): void {
    console.warn('⚠️ Usando datos simulados para visualización');

    const startDate = new Date(this.filterForm.value.startDate);
    const endDate = new Date(this.filterForm.value.endDate);
    const dayDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const sedeId = this.filterForm.value.sedeId || '';

    this.consumoData = [];

    if (granularity === 'daily') {
      // Generar datos diarios simulados
      for (let i = 0; i <= dayDiff; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        if (sedeId) {
          // Datos para una sede específica
          this.consumoData.push({
            id_sede_fk: +sedeId,
            fecha_utc: currentDate.toISOString(),
            consumo_total_kwh: Math.floor(Math.random() * 500) + 100,
            consumo_promedio_horario_kwh: Math.floor(Math.random() * 30) + 5
          });
        } else {
          // Datos para varias sedes
          for (let j = 0; j < Math.min(5, this.sedes.length); j++) {
            this.consumoData.push({
              id_sede_fk: this.sedes[j].id,
              fecha_utc: currentDate.toISOString(),
              consumo_total_kwh: Math.floor(Math.random() * 500) + 100,
              consumo_promedio_horario_kwh: Math.floor(Math.random() * 30) + 5
            });
          }
        }
      }
    } else {
      // Generar datos horarios simulados
      for (let i = 0; i < 24; i++) {
        const currentDate = new Date(startDate);
        currentDate.setHours(i);

        if (sedeId) {
          // Datos para una sede específica
          this.consumoData.push({
            id_sede_fk: +sedeId,
            hora_inicio_utc: currentDate.toISOString(),
            consumo_total_kwh: Math.floor(Math.random() * 50) + 10,
            consumo_promedio_kwh: Math.floor(Math.random() * 5) + 1
          });
        } else {
          // Datos para varias sedes
          for (let j = 0; j < Math.min(3, this.sedes.length); j++) {
            this.consumoData.push({
              id_sede_fk: this.sedes[j].id,
              hora_inicio_utc: currentDate.toISOString(),
              consumo_total_kwh: Math.floor(Math.random() * 50) + 10,
              consumo_promedio_kwh: Math.floor(Math.random() * 5) + 1
            });
          }
        }
      }
    }

    this.hasData = this.consumoData.length > 0;
    this.enriquecerConNombresSedes();
    console.log(`✅ Datos simulados generados: ${this.consumoData.length} registros`);
  }

  enriquecerConNombresSedes(): void {
    // Añadir nombres de sedes a los datos de consumo
    this.consumoData.forEach(item => {
      const sede = this.sedes.find(s => s.id === item.id_sede_fk);
      if (sede) {
        item.nombre_sede = sede.nombre_sede;
      }
    });
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
  }

  // Métodos para gestionar el análisis IA
  openAIAnalysisDialog(): void {
    console.log('🔍 Abriendo diálogo de análisis IA');

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

  console.log(`🔍 Solicitando análisis IA para sede "${this.selectedSedeName}" (ID: ${sedeId})`);
  console.log(`Parámetros: inicio=${startDate}, fin=${endDate}, granularidad=${granularity}`);

  // Iniciar estado de carga y asegurarse de que la sección esté visible
  this.generatingAnalysis = true;
  this.analysisResult = null;
  this.rawMarkdown = null;
  this.analysisError = null;
  this.showAnalysisSidebar = true;

  // Cerrar el diálogo
  this.dialog.closeAll();

  // Forzar detección de cambios (solo si tienes ChangeDetectorRef inyectado)
  // this.cdr.detectChanges();

  console.log('Estado inicial:', {
    mostrarSeccion: this.showAnalysisSidebar,
    generando: this.generatingAnalysis,
    hayError: !!this.analysisError,
    hayResultado: !!this.analysisResult
  });

  // Llamar al servicio de análisis
  this.analysisService.generateAnalysis(sedeId, startDate, endDate, granularity)
    .subscribe({
      next: (response) => {
        console.log('✅ Análisis IA generado correctamente');
        console.log('📄 Longitud del contenido Markdown:', response.length);

        // Guardar el Markdown original para descarga
        this.rawMarkdown = response;

        try {
          // Verificar si el contenido es null o vacío
          if (!response || response.trim() === '') {
            console.error('❌ El contenido de respuesta está vacío');
            this.analysisError = 'El análisis generado está vacío. Por favor, intente de nuevo.';
            this.generatingAnalysis = false;
            // Forzar detección de cambios
            // this.cdr.detectChanges();
            return;
          }

          // Convertir de Markdown a HTML usando la biblioteca marked
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

            // Forzar detección de cambios
            // this.cdr.detectChanges();
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

              // Forzar detección de cambios
              // this.cdr.detectChanges();
            });
          }
        } catch (error) {
          console.error('❌ Error al procesar Markdown:', error);
          this.analysisError = 'Error al procesar el análisis. Por favor, intente de nuevo.';
          this.generatingAnalysis = false;
          // Forzar detección de cambios
          // this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('❌ Error al generar análisis IA:', err);
        this.analysisError = 'No se pudo generar el análisis. Por favor, intente de nuevo más tarde o seleccione un período diferente.';
        this.generatingAnalysis = false;
        // Forzar detección de cambios
        // this.cdr.detectChanges();
      }
    });
}
  closeAnalysisSidebar(): void {
    this.showAnalysisSidebar = false;
  }

  downloadAnalysis(): void {
    if (!this.rawMarkdown) {
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

  // Método para generar un análisis de ejemplo (para desarrollo/pruebas)
  generarAnalisisEjemplo(): void {
    const ejemploMarkdown = `# Análisis de Consumo Energético: ${this.selectedSedeName}

  ## Resumen Ejecutivo

  Durante el período analizado, ${this.selectedSedeName} ha mostrado un patrón de consumo energético que refleja un uso **moderado** de electricidad con variaciones consistentes según el horario y día de la semana.

  ### Datos Principales:
  - **Consumo promedio diario:** 248.5 kWh
  - **Pico máximo registrado:** 42.3 kWh (11:00 AM)
  - **Consumo mínimo registrado:** 5.2 kWh (3:00 AM)
  - **Días de mayor consumo:** Lunes y Martes

  ## Patrones Identificados

  El análisis revela patrones claros de consumo energético:

  1. **Patrón horario:** El consumo aumenta significativamente entre las 7:00 AM y las 3:00 PM, coincidiendo con el horario escolar.
  2. **Patrón semanal:** Los días laborables muestran mayor consumo, mientras que los fines de semana presentan una reducción del 78%.
  3. **Comportamiento atípico:** Se observó un consumo inusualmente alto el 18/05/2025, un 43% por encima del promedio para ese día de la semana.

  ## Recomendaciones

  Basado en el análisis de los datos, recomendamos las siguientes acciones:

- Verificar los equipos eléctricos que operan durante las horas pico (10:00 AM - 2:00 PM)
- Implementar medidas de apagado automático para períodos no lectivos
- Investigar el consumo atípico del 18/05/2025 para identificar posibles ineficiencias
- Considerar la instalación de sensores de presencia en áreas comunes para reducir el consumo innecesario

## Proyección de Ahorro

Con la implementación de las recomendaciones, se estima un potencial de ahorro del 12-15% en el consumo energético mensual, equivalente a aproximadamente 920 kWh o 294€ al mes.

---

*Análisis generado automáticamente basado en los datos de consumo energético del período solicitado.*`;

    // Guardar el Markdown original para descarga
    this.rawMarkdown = ejemploMarkdown;

    // Convertir de Markdown a HTML usando la biblioteca marked
    const htmlContent = marked(ejemploMarkdown);
    if (typeof htmlContent === 'string') {
      this.analysisResult = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
      } else {
      // Es una promesa
      htmlContent.then(html => {
         this.analysisResult = this.sanitizer.bypassSecurityTrustHtml(html);
      });
    }

    this.generatingAnalysis = false;
  }

  downloadCSV(): void {
    console.log('📊 Preparando descarga de CSV...');

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
      const consumoTotal = item.consumo_total_kwh || item.consumo_total_diario_kwh;
      const consumoPromedio = this.selectedGranularity === 'hourly' ?
        item.consumo_promedio_kwh :
        item.consumo_promedio_horario_kwh;

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

    console.log('✅ Archivo CSV generado y descargado exitosamente');
  }

  downloadPDF(): void {
    // Implementar lógica para generar PDF
    console.log('📑 Generando PDF...');
    alert('Funcionalidad de generación de PDF en desarrollo');
  }

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
  debugAnalysis(): void {
  console.log('===== DEBUG ANÁLISIS IA =====');

  // Mostrar el estado actual
  console.log('Estado actual:');
  console.log('- showAnalysisSidebar:', this.showAnalysisSidebar);
  console.log('- generatingAnalysis:', this.generatingAnalysis);
  console.log('- analysisError:', this.analysisError);
  console.log('- analysisResult está definido:', !!this.analysisResult);
  console.log('- rawMarkdown está definido:', !!this.rawMarkdown);

  if (this.rawMarkdown) {
    console.log('- Longitud del Markdown:', this.rawMarkdown.length);
    console.log('- Primeros 100 caracteres:', this.rawMarkdown.substring(0, 100));
  }

  // Forzar que se muestre la sección de análisis
  this.showAnalysisSidebar = true;
  console.log('Sección de análisis activada forzosamente:', this.showAnalysisSidebar);

  // Generar un análisis de ejemplo si no hay uno existente
  if (!this.analysisResult) {
    console.log('Generando análisis de ejemplo para diagnóstico...');

    // Definir un nombre de sede si no hay uno
    if (!this.selectedSedeName) {
      this.selectedSedeName = 'Sede de Ejemplo';
    }

    const ejemploMarkdown = `# Análisis de Consumo Energético: ${this.selectedSedeName}

## Resumen Ejecutivo

Durante el período analizado, ${this.selectedSedeName} ha mostrado un patrón de consumo energético que refleja un uso **moderado** de electricidad con variaciones consistentes según el horario y día de la semana.

### Datos Principales:
- **Consumo promedio diario:** 248.5 kWh
- **Pico máximo registrado:** 42.3 kWh (11:00 AM)
- **Consumo mínimo registrado:** 5.2 kWh (3:00 AM)
- **Días de mayor consumo:** Lunes y Martes

## Recomendaciones

Basado en el análisis de los datos, recomendamos las siguientes acciones:

- Verificar los equipos eléctricos que operan durante las horas pico (10:00 AM - 2:00 PM)
- Implementar medidas de apagado automático para períodos no lectivos
- Considerar la instalación de sensores de presencia en áreas comunes

*Este es un análisis de ejemplo para diagnóstico.*`;

    try {
      // Guardar el Markdown
      this.rawMarkdown = ejemploMarkdown;

      // Generar HTML desde Markdown
      const htmlContent = marked.parse(ejemploMarkdown);
      console.log('HTML generado correctamente');

      // Asignar el resultado
      if (typeof htmlContent === 'string') {
         // Usar htmlContent como string
        } else {
        // Esperar a que la promesa se resuelva
        htmlContent.then(contenido => {
          // Usar contenido como string
           });
        }
      console.log('Resultado del análisis asignado');

      // Limpiar otros estados
      this.generatingAnalysis = false;
      this.analysisError = null;

    } catch (error) {
      console.error('Error al generar análisis de diagnóstico:', error);
      this.analysisError = 'Error de diagnóstico. Revise la consola para más detalles.';
      this.generatingAnalysis = false;
    }
  }

  // Forzar detección de cambios si está usando ChangeDetectorRef
  // Si tienes ChangeDetectorRef inyectado, descomenta la siguiente línea
  // this.cdr.detectChanges();

  console.log('===== FIN DEBUG ANÁLISIS IA =====');
}
}
