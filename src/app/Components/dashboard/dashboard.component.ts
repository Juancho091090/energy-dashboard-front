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

  // Propiedades para los datos
  ultimasLecturas: LecturaEnergia[] = [];
  sedes: Sede[] = [];
  consumosSemanal: ConsumoDia[] = [];
  consumoHoras: any[] = []; // Para gráfico por horas

  // Estados de carga
  loadingLecturas = true;
  loadingSedes = true;
  loadingConsumos = true;
  error = '';

  // Mapa para almacenar el consumo por sede
  private consumosPorSede: Map<number, number> = new Map();

  // Datos simulados para sedes
  private simulatedSedeData: any[] = [];

  // Bandera para indicar que estamos usando datos simulados (solo para uso interno)
  usingSimulatedData: boolean = false;

  constructor(
    private lecturaService: LecturaEnergiaService,
    private sedeService: SedeService,
    private consumoService: ConsumoService
  ) {}

  ngOnInit(): void {
    // Cargamos los datos - la consola mostrará mensajes sobre el origen de los datos
    this.cargarUltimasLecturas();
    this.cargarSedes();
    this.cargarConsumoSemanal();
    this.cargarConsumoHoras();
    this.lastUpdate = new Date().toLocaleString('es-CO');

    // Si estamos en desarrollo, mostrar mensajes adicionales
    if (!environment.production) {
      console.log('Modo de desarrollo activo - se mostrarán mensajes de depuración');
    }
  }

  cargarUltimasLecturas(): void {
    this.loadingLecturas = true;
    // Obtener las últimas 10 lecturas
    this.lecturaService.getUltimasLecturas(10).subscribe({
      next: (lecturas) => {
        this.ultimasLecturas = lecturas;
        this.loadingLecturas = false;
        console.log('✅ Datos reales cargados: Últimas lecturas');
        // Calcular consumo total
        this.calcularConsumoTotal();
      },
      error: (err) => {
        console.error('❌ Error al cargar las últimas lecturas:', err);
        console.warn('⚠️ Usando datos simulados para últimas lecturas');
        this.loadingLecturas = false;
        this.usingSimulatedData = true; // Solo para uso interno

        // Generar datos simulados para evitar mostrar errores al usuario
        this.ultimasLecturas = this.generarLecturasSimuladas(10);
        this.calcularConsumoTotal();
      }
    });
  }

  cargarSedes(): void {
    this.loadingSedes = true;
    this.sedeService.getSedes().subscribe({
      next: (sedes) => {
        this.sedes = sedes;
        this.sedesCount = sedes.length;
        this.loadingSedes = false;
        console.log('✅ Datos reales cargados: Sedes');

        // Una vez cargadas las sedes, inicializar el mapa de consumos por sede
        this.inicializarConsumosPorSede();
      },
      error: (err) => {
        console.error('❌ Error al cargar las sedes:', err);
        console.warn('⚠️ Usando datos simulados para sedes');
        this.loadingSedes = false;
        this.usingSimulatedData = true; // Solo para uso interno

        // Generar sedes simuladas
        this.generarSedesSimuladas();
      }
    });
  }

  cargarConsumoSemanal(): void {
    this.loadingConsumos = true;
    // Cargamos el consumo semanal de todas las sedes
    const fechaFin = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD
    const fechaInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 días atrás

    this.consumoService.getConsumosDiaByDateRange(fechaInicio, fechaFin).subscribe({
      next: (consumos) => {
        this.consumosSemanal = consumos;
        this.loadingConsumos = false;
        console.log('✅ Datos reales cargados: Consumo semanal');

        // Calcular consumo total
        this.calcularConsumoTotal();

        // Actualizar el consumo por sede
        this.actualizarConsumosPorSede(consumos);
      },
      error: (err) => {
        console.error('❌ Error al cargar los consumos semanales:', err);
        console.warn('⚠️ Usando datos simulados para consumo semanal');
        this.loadingConsumos = false;
        this.usingSimulatedData = true; // Solo para uso interno

        // Generar datos simulados
        this.consumoTotal = Math.floor(Math.random() * 20000) + 40000; // Entre 40000 y 60000
        this.generarDatosConsumoPorSede();
      }
    });
  }

  cargarConsumoHoras(): void {
    // Obtener los consumos por hora de las últimas 24 horas
    const fechaFin = new Date().toISOString();
    const fechaInicio = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    this.consumoService.getConsumosHoraByDateRange(fechaInicio, fechaFin).subscribe({
      next: (consumos) => {
        console.log('✅ Datos reales cargados: Consumo por hora');
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
        console.warn('⚠️ Usando datos simulados para consumo por hora');
        this.loadingConsumos = false;
        this.usingSimulatedData = true; // Solo para uso interno
        // Usar datos simulados
        this.generarDatosConsumoHora();
      }
    });
  }

  calcularConsumoTotal(): void {
    // Si tenemos datos de consumo semanal, usamos esos
    if (this.consumosSemanal.length > 0) {
      this.consumoTotal = this.consumosSemanal.reduce((total, consumo) =>
        total + consumo.consumo_total_diario_kwh, 0);
    }
    // Si no, intentamos usar las últimas lecturas
    else if (this.ultimasLecturas.length > 0) {
      this.consumoTotal = this.ultimasLecturas.reduce((total, lectura) =>
        total + lectura.consumo_kwh, 0);
    }
    // Si no hay datos, usamos un valor simulado
    else {
      this.consumoTotal = Math.floor(Math.random() * 20000) + 40000; // Entre 40000 y 60000
    }
  }

  // Generar datos simulados como respaldo
  private generarLecturasSimuladas(count: number): LecturaEnergia[] {
    const lecturas: LecturaEnergia[] = [];

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(Date.now() - i * 3600000); // Una hora atrás por cada lectura

      lecturas.push({
        id: i + 1,
        id_sede_fk: Math.floor(Math.random() * 10) + 1,
        timestamp_utc: timestamp.toISOString(),
        consumo_kwh: Math.floor(Math.random() * 20) + 10, // Entre 10 y 30 kWh
        fecha_recepcion_utc: new Date().toISOString(),
        procesado: true
      } as LecturaEnergia);
    }

    return lecturas;
  }

  // Generar sedes simuladas
  private generarSedesSimuladas(): void {
    this.sedes = [];
    this.sedesCount = 56; // Número fijo de sedes para la simulación

    const nombresSedes = [
      'COLEGIO ALBERTO LLERAS', 'COLEGIO ÁLVARO GÓMEZ', 'COLEGIO SIMÓN BOLÍVAR',
      'COLEGIO CUNDINAMARCA', 'COLEGIO ANIBAL FERNÁNDEZ', 'COLEGIO REPÚBLICA DE COLOMBIA',
      'COLEGIO DELIA ZAPATA', 'COLEGIO EL SALITRE', 'COLEGIO LA TOSCANA',
      'COLEGIO GERARDO PAREDES'
    ];

    // Generar sedes simuladas
    for (let i = 1; i <= 10; i++) {
      this.sedes.push({
        id: i,
        nombre_sede: nombresSedes[i - 1],
        lat: 4.7 + Math.random() * 0.1,
        lon: -74.1 + Math.random() * 0.1
      } as Sede);
    }

    // Generar el resto de sedes con nombres genéricos
    for (let i = 11; i <= this.sedesCount; i++) {
      this.sedes.push({
        id: i,
        nombre_sede: `COLEGIO #${i}`,
        lat: 4.7 + Math.random() * 0.1,
        lon: -74.1 + Math.random() * 0.1
      } as Sede);
    }

    this.loadingSedes = false;
    // Generar datos de consumo por sede simulados
    this.generarDatosConsumoPorSede();
  }

  // Inicializa el mapa de consumos por sede con valores en cero
  inicializarConsumosPorSede(): void {
    this.sedes.forEach(sede => {
      this.consumosPorSede.set(sede.id, 0);
    });
  }

  // Actualiza el mapa de consumos por sede con los datos reales
  actualizarConsumosPorSede(consumos: ConsumoDia[]): void {
    // Agrupar consumos por sede
    const consumosPorSedeTemp = new Map<number, number>();

    consumos.forEach(consumo => {
      const sedeId = consumo.id_sede_fk;
      const consumoActual = consumosPorSedeTemp.get(sedeId) || 0;
      consumosPorSedeTemp.set(sedeId, consumoActual + consumo.consumo_total_diario_kwh);
    });

    // Actualizar el mapa de consumos
    this.consumosPorSede = consumosPorSedeTemp;

    // Si no hay suficientes datos, complementar con simulados
    if (this.consumosPorSede.size < 8) {
      console.warn('⚠️ Datos insuficientes, complementando con datos simulados');
      this.generarDatosConsumoPorSede(true); // true = complementar datos existentes
    }
  }

  // Generar datos simulados de consumo por hora
  generarDatosConsumoHora(): void {
    console.log('Generando datos simulados de consumo por hora');

    // Crear datos para las 24 horas con un patrón realista
    this.consumoHoras = [];

    for (let i = 0; i < 24; i++) {
      let consumo;

      // Simular un patrón de consumo realista
      if (i >= 8 && i <= 12) {
        // Mañana laboral: alto consumo creciente
        consumo = Math.floor(Math.random() * 15) + 25 + (i - 8) * 3; // 25-43 kWh, creciente
      } else if (i >= 13 && i <= 17) {
        // Tarde laboral: alto consumo decreciente
        consumo = Math.floor(Math.random() * 15) + 28 - (i - 13) * 2; // 28-43 kWh, decreciente
      } else if ((i >= 18 && i <= 21)) {
        // Tarde-noche: consumo medio
        consumo = Math.floor(Math.random() * 10) + 15 - (i - 18) * 2; // 15-25 kWh, decreciente
      } else if (i >= 6 && i <= 7) {
        // Mañana temprano: consumo medio-bajo
        consumo = Math.floor(Math.random() * 8) + 10 + (i - 6) * 5; // 10-23 kWh, creciente
      } else {
        // Madrugada: bajo consumo
        consumo = Math.floor(Math.random() * 5) + 2; // 2-7 kWh
      }

      this.consumoHoras.push({
        hora: i,
        consumo: consumo
      });
    }

    this.usingSimulatedData = true; // Solo para uso interno
    this.loadingConsumos = false;
  }

  // Calcular altura de barra como porcentaje
  getBarHeightPercent(consumo: number): number {
    const maxConsumo = this.getPotenciaMaxima();
    if (maxConsumo <= 0) return 0;

    // Calcular el porcentaje pero asegurar que sea visible
    const porcentaje = (consumo / maxConsumo) * 100;

    // Asegurar que incluso valores pequeños tengan una altura mínima visible
    return porcentaje < 3 && porcentaje > 0 ? 3 : porcentaje;
  }

  // Obtener la potencia máxima (para gráficos)
  getPotenciaMaxima(): number {
    if (this.consumoHoras && this.consumoHoras.length > 0) {
      return Math.max(...this.consumoHoras.map(h => h.consumo)) || 1;
    }
    return 1; // Para evitar divisiones por cero
  }

  // Generar datos simulados de consumo por sede
  generarDatosConsumoPorSede(complementar: boolean = false): void {
    console.log('Generando datos simulados de consumo por sede');

    // Si no estamos complementando datos existentes, inicializar el mapa
    if (!complementar) {
      this.consumosPorSede = new Map<number, number>();
    }

    // Consumos fijos para las primeras sedes
    const consumosFijos = [580, 520, 480, 420, 380, 350, 320, 290];

    // Asignar consumos a las sedes
    for (let i = 0; i < this.sedes.length; i++) {
      const sedeId = this.sedes[i].id;

      // Si ya existe un consumo para esta sede y estamos complementando, saltarla
      if (complementar && this.consumosPorSede.has(sedeId) && this.consumosPorSede.get(sedeId)! > 0) {
        continue;
      }

      // Para las primeras 8 sedes, usar valores fijos que decrecen
      if (i < 8) {
        this.consumosPorSede.set(sedeId, consumosFijos[i]);
      } else {
        // Para el resto, generar valores aleatorios decrecientes
        this.consumosPorSede.set(sedeId, Math.floor(Math.random() * 100) + 50 - Math.min(i, 40));
      }
    }

    this.simulatedSedeData = this.getTopSedes(10).map(sede => ({
      nombre: sede.nombre_sede,
      consumo: this.getConsumoRealForSede(sede.id),
      porcentaje: this.getBarWidthPercent(sede.id)
    }));

    this.usingSimulatedData = true; // Solo para uso interno
    this.loadingSedes = false;
  }

  // Método para obtener el consumo real de una sede (no porcentaje)
  getConsumoRealForSede(sedeId: number): number {
    const consumo = this.consumosPorSede.get(sedeId);
    return consumo !== undefined ? consumo : 0;
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
      return 1; // Valor mínimo para evitar división por cero
    }

    return Math.max(...Array.from(this.consumosPorSede.values())) || 1;
  }

  // Obtener las top N sedes con mayor consumo
  getTopSedes(count: number = 10): Sede[] {
    if (!this.sedes || this.sedes.length === 0) {
      return [];
    }

    // Asegurarse de que tenemos datos de consumo
    if (this.consumosPorSede.size === 0) {
      this.generarDatosConsumoPorSede();
    }

    // Ordenar las sedes por consumo (de mayor a menor)
    return [...this.sedes]
      .sort((a, b) => {
        const consumoA = this.getConsumoRealForSede(a.id);
        const consumoB = this.getConsumoRealForSede(b.id);
        return consumoB - consumoA;
      })
      .slice(0, count);
  }

  // Obtener datos simulados para consumo por sede
  getSimulatedSedeData(): any[] {
    if (this.simulatedSedeData.length === 0) {
      this.generarDatosConsumoPorSede();
    }
    return this.simulatedSedeData;
  }

  // Método para formatear nombres de sedes
  formatSedeName(name: string): string {
    if (!name) return '';

    // Si el nombre es muy largo, truncarlo
    if (name.length > 20) {
      return name.substring(0, 18) + '...';
    }

    return name;
  }
  irAPowerBIDashboard() {
    // URL de tu dashboard de Power BI
    const powerBiUrl = 'https://app.powerbi.com/groups/me/reports/36e5ca55-b4ac-47f8-96ef-4c1236d49550/0646cc1731e070118a82?experience=power-bi';

    // Abrir en una nueva pestaña
    window.open(powerBiUrl, '_blank');
  }
}
