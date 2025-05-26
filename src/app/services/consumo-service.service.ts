// src/app/services/consumo-service.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConsumoHora } from '../models/consumo-hora.model';
import { ConsumoDia } from '../models/consumo-dia.model';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ConsumoService {
  // Utilizar environment para la URL base
  private apiUrl = environment.apiUrl + '/consumo';

  // Bandera para controlar el uso de datos simulados
  private useMockData = true; // Establecer a false cuando la API esté disponible

  constructor(private http: HttpClient) {}

  getConsumosHoraByDateRange(startDate: string, endDate: string, sedeId?: number): Observable<ConsumoHora[]> {
    if (this.useMockData) {
      return of(this.generarConsumosHoraSimulados(startDate, endDate, sedeId));
    }

    let params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);

    if (sedeId) {
      params = params.set('sede_id', sedeId.toString());
    }

    // Intentar primero con /hora y si falla probar con -hora
    return this.http.get<ConsumoHora[]>(`${this.apiUrl}/hora`, { params })
      .pipe(
        catchError((error) => {
          if (error.status === 404) {
            // Intentar con la ruta alternativa
            return this.http.get<ConsumoHora[]>(`${this.apiUrl}-hora`, { params })
              .pipe(
                catchError(() => {
                  console.warn('Ambas rutas de API fallaron, usando datos simulados');
                  return of(this.generarConsumosHoraSimulados(startDate, endDate, sedeId));
                })
              );
          }
          console.warn('Error en API, usando datos simulados:', error);
          return of(this.generarConsumosHoraSimulados(startDate, endDate, sedeId));
        })
      );
  }

  getConsumosDiaByDateRange(startDate: string, endDate: string, sedeId?: number): Observable<ConsumoDia[]> {
    if (this.useMockData) {
      return of(this.generarConsumosDiaSimulados(startDate, endDate, sedeId));
    }

    let params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);

    if (sedeId) {
      params = params.set('sede_id', sedeId.toString());
    }

    // Intentar primero con /dia y si falla probar con -dia
    return this.http.get<ConsumoDia[]>(`${this.apiUrl}/dia`, { params })
      .pipe(
        catchError((error) => {
          if (error.status === 404) {
            // Intentar con la ruta alternativa
            return this.http.get<ConsumoDia[]>(`${this.apiUrl}-dia`, { params })
              .pipe(
                catchError(() => {
                  console.warn('Ambas rutas de API fallaron, usando datos simulados');
                  return of(this.generarConsumosDiaSimulados(startDate, endDate, sedeId));
                })
              );
          }
          console.warn('Error en API, usando datos simulados:', error);
          return of(this.generarConsumosDiaSimulados(startDate, endDate, sedeId));
        })
      );
  }

  // Método para generar datos simulados de consumo por hora
  private generarConsumosHoraSimulados(startDate: string, endDate: string, sedeId?: number): ConsumoHora[] {
    console.log('Generando datos simulados de consumo por hora');
    const resultado: ConsumoHora[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Si la fecha de inicio es inválida, usar hace 24 horas
    const validStart = isNaN(start.getTime()) ? new Date(Date.now() - 24 * 60 * 60 * 1000) : start;
    // Si la fecha de fin es inválida, usar la fecha actual
    const validEnd = isNaN(end.getTime()) ? new Date() : end;

    const currentDate = new Date(validStart);

    while (currentDate <= validEnd) {
      // Si se especifica una sede, generar solo para esa sede; de lo contrario, para todas
      const sedeIds = sedeId ? [sedeId] : Array.from({length: 30}, (_, i) => i + 1);

      sedeIds.forEach(id => {
        // Generar un consumo que dependa de la hora del día (mayor durante horas laborales)
        const hora = currentDate.getHours();
        let consumoBase = 5; // Consumo base

        // Consumo más alto en horas laborales (8am-4pm)
        if (hora >= 8 && hora < 16) {
          consumoBase = 30;
        }
        // Consumo medio en la tarde-noche (4pm-10pm)
        else if (hora >= 16 && hora < 22) {
          consumoBase = 15;
        }

        // Añadir variación aleatoria (±20%)
        const variacion = consumoBase * (0.8 + Math.random() * 0.4);
        const consumoTotal = Math.round(variacion * 100) / 100;

        // Simular entre 10-20 lecturas por hora
        const numLecturas = Math.floor(Math.random() * 11) + 10;

        resultado.push({
          id: Date.now() + Math.floor(Math.random() * 10000),
          id_sede_fk: id,
          hora_inicio_utc: new Date(currentDate).toISOString(),
          consumo_total_kwh: consumoTotal,
          numero_lecturas: numLecturas,
          consumo_promedio_kwh: Math.round((consumoTotal / numLecturas) * 100) / 100,
          fecha_procesamiento_utc: new Date().toISOString()
        } as ConsumoHora);
      });

      // Avanzar una hora
      currentDate.setHours(currentDate.getHours() + 1);
    }

    return resultado;
  }

  // Método para generar datos simulados de consumo por día
  private generarConsumosDiaSimulados(startDate: string, endDate: string, sedeId?: number): ConsumoDia[] {
    console.log('Generando datos simulados de consumo por día');
    const resultado: ConsumoDia[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Si la fecha de inicio es inválida, usar hace 30 días
    const validStart = isNaN(start.getTime()) ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : start;
    // Si la fecha de fin es inválida, usar la fecha actual
    const validEnd = isNaN(end.getTime()) ? new Date() : end;

    const currentDate = new Date(validStart);
    currentDate.setHours(0, 0, 0, 0); // Establecer a inicio del día

    while (currentDate <= validEnd) {
      // Si se especifica una sede, generar solo para esa sede; de lo contrario, para todas
      const sedeIds = sedeId ? [sedeId] : Array.from({length: 30}, (_, i) => i + 1);

      sedeIds.forEach(id => {
        // Determinar si es día de semana (0 = domingo, 6 = sábado)
        const diaSemana = currentDate.getDay();
        const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

        // Consumo base menor en fines de semana
        let consumoBase = esFinDeSemana ? 50 : 300;

        // Añadir variación aleatoria (±30%)
        const variacion = consumoBase * (0.7 + Math.random() * 0.6);
        const consumoTotal = Math.round(variacion * 100) / 100;

        // Simular entre 10-24 horas con datos por día
        const horasRegistradas = esFinDeSemana ?
          Math.floor(Math.random() * 7) + 4 : // 4-10 horas los fines de semana
          Math.floor(Math.random() * 6) + 18; // 18-24 horas los días laborables

        resultado.push({
          id: Date.now() + Math.floor(Math.random() * 10000),
          id_sede_fk: id,
          fecha_utc: currentDate.toISOString().split('T')[0],
          consumo_total_diario_kwh: consumoTotal,
          numero_horas_registradas: horasRegistradas,
          consumo_promedio_horario_kwh: Math.round((consumoTotal / horasRegistradas) * 100) / 100,
          fecha_procesamiento_utc: new Date().toISOString()
        } as ConsumoDia);
      });

      // Avanzar un día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return resultado;
  }
}
