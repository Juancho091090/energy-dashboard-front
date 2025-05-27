// src/app/components/dashboard/dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LecturaEnergiaService } from '../../services/lectura-energia.service';
import { SedeService } from '../../services/sede.service';
import { ConsumoService } from '../../services/consumo-service.service';
import { LecturaEnergia } from '../../models/lectura-energia.model';
import { Sede } from '../../models/sede.model';
import { ConsumoDia } from '../../models/consumo-dia.model';
import { ConsumoHora } from '../../models/consumo-hora.model';
import { environment } from '../../../environment/environment';

// Importaciones de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { NavbarComponent } from "../Shared/navbar/navbar.component";
import { FooterComponent } from '../Shared/footer/footer.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Propiedades para las métricas
  consumoTotal: number = 0;
  sedesCount: number = 0;
  lastUpdate: string = '';
  private consumosTemporales: ConsumoDia[] = [];
  private sedesCargadas = false;
  private consumosCargados = false;

  // Propiedades para los datos
  ultimasLecturas: LecturaEnergia[] = [];
  sedes: Sede[] = [];
  consumosSemanal: ConsumoDia[] = [];
  consumoHoras: any[] = []; // Para gráfico por horas

  // Estados de carga
  loadingLecturas = true;
  loadingSedes = true;
  loadingConsumos = true;

  // Estados de error
  errorLecturas = false;
  errorSedes = false;
  errorConsumos = false;

  // Mapa para almacenar el consumo por sede
  private consumosPorSede: Map<number, number> = new Map();

  constructor(
    private lecturaService: LecturaEnergiaService,
    private sedeService: SedeService,
    private consumoService: ConsumoService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Iniciando carga de datos reales del backend');
    this.cargarUltimasLecturas();
    this.cargarSedes();
    this.cargarConsumoSemanal();
    this.cargarConsumoHoras();
    this.lastUpdate = new Date().toLocaleString('es-CO');

    if (!environment.production) {
      console.log('Modo de desarrollo activo - solo datos reales del backend');
    }
  }

  cargarUltimasLecturas(): void {
    this.loadingLecturas = true;
    this.errorLecturas = false;

    this.lecturaService.getUltimasLecturas(10).subscribe({
      next: (lecturas) => {
        this.ultimasLecturas = lecturas;
        this.loadingLecturas = false;
        console.log('✅ Datos reales cargados: Últimas lecturas', lecturas.length, 'registros');
        this.calcularConsumoTotal();
      },
      error: (err) => {
        console.error('❌ Error al cargar las últimas lecturas:', err);
        this.loadingLecturas = false;
        this.errorLecturas = true;
        this.ultimasLecturas = [];
      }
    });
  }

  cargarSedes(): void {
    this.loadingSedes = true;
    this.errorSedes = false;

    this.sedeService.getSedes().subscribe({
      next: (sedes) => {
        this.sedes = sedes;
        this.sedesCount = sedes.length;
        this.loadingSedes = false;
        this.sedesCargadas = true;

        console.log('✅ Datos reales cargados: Sedes', sedes.length, 'registros');
        this.inicializarConsumosPorSede();

        this.intentarMapeoCompleto();
      },
      error: (err) => {
        console.error('❌ Error al cargar las sedes:', err);
        this.loadingSedes = false;
        this.errorSedes = true;
        this.sedes = [];
        this.sedesCount = 0;
      }
    });
  }

  cargarConsumoSemanal(): void {
    this.loadingConsumos = true;
    this.errorConsumos = false;

    const fechaFin = new Date().toISOString().split('T')[0];
    const fechaInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    this.consumoService.getConsumosDiaByDateRange(fechaInicio, fechaFin).subscribe({
      next: (consumos) => {
        this.consumosSemanal = consumos;
        this.consumosTemporales = consumos;
        this.consumosCargados = true;
        console.log('✅ Datos reales cargados: Consumo semanal', consumos.length, 'registros');
        this.calcularConsumoTotal();
        this.actualizarConsumosPorSede(consumos);

        this.intentarMapeoCompleto();
      },
      error: (err) => {
        console.error('❌ Error al cargar los consumos semanales:', err);
        this.errorConsumos = true;
        this.consumosSemanal = [];
        this.consumoTotal = 0;
      }
    });
  }

  cargarConsumoHoras(): void {
    const fechaFin = new Date().toISOString();
    const fechaInicio = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    this.consumoService.getConsumosHoraByDateRange(fechaInicio, fechaFin).subscribe({
      next: (consumos) => {
        console.log('✅ Datos reales cargados: Consumo por hora', consumos.length, 'registros');

        // Adaptar datos para la visualización
        this.consumoHoras = Array.from(Array(24).keys()).map(hora => {
          const consumo = consumos.find(c => new Date(c.hora_inicio_utc).getHours() === hora);
          return {
            hora,
            consumo: consumo ? Math.round(consumo.consumo_total_kwh) : 0
          };
        });
        this.loadingConsumos = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar consumos por hora:', err);
        this.loadingConsumos = false;
        this.consumoHoras = Array.from(Array(24).keys()).map(hora => ({
          hora,
          consumo: 0
        }));
      }
    });
  }

  calcularConsumoTotal(): void {
    // Si tenemos datos de consumo semanal, usamos esos
    if (this.consumosSemanal.length > 0) {
      this.consumoTotal = this.consumosSemanal.reduce((total, consumo) =>
        total + consumo.consumo_total_diario_kwh, 0);
      console.log('💡 Consumo total calculado desde datos semanales:', this.consumoTotal, 'kWh');
    }
    // Si no, intentamos usar las últimas lecturas
    else if (this.ultimasLecturas.length > 0) {
      this.consumoTotal = this.ultimasLecturas.reduce((total, lectura) =>
        total + lectura.consumo_kwh, 0);
      console.log('💡 Consumo total calculado desde últimas lecturas:', this.consumoTotal, 'kWh');
    }
    // Si no hay datos, mostrar 0
    else {
      this.consumoTotal = 0;
      console.log('⚠️ No hay datos para calcular consumo total');
    }
  }

  // Inicializar el mapa de consumos por sede
  inicializarConsumosPorSede(): void {
    this.consumosPorSede.clear();
    this.sedes.forEach(sede => {
      this.consumosPorSede.set(sede.id, 0);
    });
    console.log('🗺️ Mapa de consumos por sede inicializado para', this.sedes.length, 'sedes');
  }

  // Actualizar el mapa de consumos por sede con los datos reales
  actualizarConsumosPorSede(consumos: ConsumoDia[]): void {
    // Limpiar el mapa
    this.consumosPorSede.clear();
    console.log('🔍 INICIO MAPEO');
    console.log('🔍 Consumos recibidos:', consumos.length);
    console.log('🔍 Sedes disponibles:', this.sedes.length);

    const consumosPorIndice = new Map<number, number>();

    consumos.forEach(consumo => {
      const indice = consumo.id_sede_fk;
      const consumoActual = consumosPorIndice.get(indice) || 0;
      const nuevoConsumo = consumoActual + consumo.consumo_total_diario_kwh;
      consumosPorIndice.set(indice, nuevoConsumo);
    });
    console.log('🔍 Consumos por índice:', Array.from(consumosPorIndice.entries()).slice(0, 5));

    this.sedes.forEach((sede, index) => {
    const indiceConsumo = index + 1; // 1, 2, 3, 4, 5...
    const consumo = consumosPorIndice.get(indiceConsumo) || 0;
    if (index < 5) {
      console.log(`🔍 Mapeo sede ${index}: ID=${sede.id}, indiceConsumo=${indiceConsumo}, consumo=${consumo}`);
    }
    this.consumosPorSede.set(sede.id, consumo); // Usar ID real de la sede
  });

    console.log('📊 Mapeo completado:', this.consumosPorSede.size, 'sedes con consumo');
    console.log('📊 Primeras 3 sedes mapeadas:',
    Array.from(this.consumosPorSede.entries()).slice(0, 3));
  }

  // Calcular altura de barra como porcentaje
  getBarHeightPercent(consumo: number): number {
    const maxConsumo = this.getPotenciaMaxima();
    if (maxConsumo <= 0) return 0;

    const porcentaje = (consumo / maxConsumo) * 100;
    return porcentaje < 3 && porcentaje > 0 ? 3 : porcentaje;
  }

  // Obtener la potencia máxima (para gráficos)
  getPotenciaMaxima(): number {
    if (this.consumoHoras && this.consumoHoras.length > 0) {
      return Math.max(...this.consumoHoras.map(h => h.consumo)) || 1;
    }
    return 1;
  }

  // Obtener el consumo real de una sede
  getConsumoRealForSede(sedeId: number): number {
    const consumo = this.consumosPorSede.get(sedeId);
    const valor = consumo !== undefined ? consumo : 0;
    return Math.round(valor * 100) / 100;
  }

  // Calcular el porcentaje para la barra horizontal
  getBarWidthPercent(sedeId: number): number {
    const maxConsumo = this.getMaxConsumoSede();
    if (maxConsumo <= 0) return 0;

    const consumo = this.getConsumoRealForSede(sedeId);
    return (consumo / maxConsumo) * 100;
  }

  // Obtener el consumo máximo entre todas las sedes
  getMaxConsumoSede(): number {
    if (!this.sedes || this.sedes.length === 0 || this.consumosPorSede.size === 0) {
      return 1;
    }

    return Math.max(...Array.from(this.consumosPorSede.values())) || 1;
  }

  // Obtener las top N sedes con mayor consumo
  getTopSedes(count: number = 10): Sede[] {
    if (!this.sedes || this.sedes.length === 0) {
      return [];
    }

    console.log('🔍 getTopSedes - Mapa de consumos:', this.consumosPorSede.size);

    // Si no hay datos de consumo, mostrar las primeras sedes
    if (this.consumosPorSede.size === 0) {
      console.log('⚠️ No hay datos de consumo, mostrando primeras sedes');
      return this.sedes.slice(0, count);
    }

    // Ordenar las sedes por consumo (de mayor a menor)
    const result = [...this.sedes]
      .sort((a, b) => {
        const consumoA = this.getConsumoRealForSede(a.id);
        const consumoB = this.getConsumoRealForSede(b.id);
        return consumoB - consumoA;
      })
      .slice(0, count);
      console.log('🔍 Top sedes resultado:', result.slice(0, 3).map(s => ({
    id: s.id,
    nombre: s.nombre_sede,
    consumo: this.getConsumoRealForSede(s.id)
  })));
  return result;
  }

  // Método para formatear nombres de sedes
  formatSedeName(name: string): string {
    if (!name) return '';

    if (name.length > 20) {
      return name.substring(0, 18) + '...';
    }

    return name;
  }

  // Verificar si hay datos disponibles
  hasData(): boolean {
    return this.sedes.length > 0 || this.ultimasLecturas.length > 0 || this.consumosSemanal.length > 0;
  }

  // Verificar si está cargando
  isLoading(): boolean {
    return this.loadingLecturas || this.loadingSedes || this.loadingConsumos;
  }

  // Verificar si hay errores
  hasErrors(): boolean {
    return this.errorLecturas || this.errorSedes || this.errorConsumos;
  }

  // Recargar todos los datos
  recargarDatos(): void {
    console.log('🔄 Recargando todos los datos...');
    this.ngOnInit();
  }

  // Ir a Power BI Dashboard
  irAPowerBIDashboard(): void {
    const powerBiUrl = 'https://app.powerbi.com/groups/me/reports/36e5ca55-b4ac-47f8-96ef-4c1236d49550/0646cc1731e070118a82?experience=power-bi';
    window.open(powerBiUrl, '_blank');
  }

  private intentarMapeoCompleto(): void {
  if (this.sedesCargadas && this.consumosCargados) {
    console.log('🔄 Ambos datos listos, ejecutando mapeo completo...');
    this.actualizarConsumosPorSede(this.consumosTemporales);
  } else {
    console.log('⏳ Esperando datos... Sedes:', this.sedesCargadas, 'Consumos:', this.consumosCargados);
  }
}
}
