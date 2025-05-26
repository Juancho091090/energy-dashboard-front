// src/app/services/lectura-energia.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LecturaEnergia } from '../models/lectura-energia.model';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class LecturaEnergiaService {
  private apiUrl = environment.apiUrl;
  private useMockData = true; // Establecer a false cuando la API esté disponible

  constructor(private http: HttpClient) {}

  getUltimasLecturas(limit: number): Observable<LecturaEnergia[]> {
    if (this.useMockData) {
      return of(this.generarLecturasSimuladas(limit));
    }

    const params = new HttpParams().set('limit', limit.toString());

    // Intentar varias posibles rutas de API
    return this.http.get<LecturaEnergia[]>(`${this.apiUrl}/energy_data/ultimas`, { params })
      .pipe(
        catchError(() => {
          // Intentar ruta alternativa
          return this.http.get<LecturaEnergia[]>(`${this.apiUrl}/lecturas/ultimas`, { params })
            .pipe(
              catchError(() => {
                console.warn('Ambas rutas fallaron, usando datos simulados');
                return of(this.generarLecturasSimuladas(limit));
              })
            );
        })
      );
  }

  getUltimasLecturasBySede(sedeId: number, limit: number): Observable<LecturaEnergia[]> {
    if (this.useMockData) {
      return of(this.generarLecturasSimuladas(limit, sedeId));
    }

    const params = new HttpParams()
      .set('sede_id', sedeId.toString())
      .set('limit', limit.toString());

    // Intentar varias posibles rutas de API
    return this.http.get<LecturaEnergia[]>(`${this.apiUrl}/energy_data/ultimas`, { params })
      .pipe(
        catchError(() => {
          // Intentar ruta alternativa
          return this.http.get<LecturaEnergia[]>(`${this.apiUrl}/lecturas/ultimas`, { params })
            .pipe(
              catchError(() => {
                console.warn('Ambas rutas fallaron, usando datos simulados');
                return of(this.generarLecturasSimuladas(limit, sedeId));
              })
            );
        })
      );
  }

  // Método para generar lecturas simuladas
  private generarLecturasSimuladas(limit: number, sedeId?: number): LecturaEnergia[] {
    console.log(`Generando ${limit} lecturas simuladas${sedeId ? ` para sede ${sedeId}` : ''}`);
    const resultado: LecturaEnergia[] = [];

    // Si se especifica una sede, generar solo para esa sede; de lo contrario, generar para varias
    const sedeIds = sedeId ? [sedeId] : Array.from({length: Math.min(limit, 30)}, (_, i) => i + 1);

    // Distribuir el número total de lecturas entre las sedes
    const lecturasPerSede = Math.max(1, Math.floor(limit / sedeIds.length));

    sedeIds.forEach(id => {
      // Generar lecturas para esta sede
      for (let i = 0; i < (sedeId ? limit : lecturasPerSede); i++) {
        // Generar una marca de tiempo aleatoria en las últimas 24 horas
        const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

        // Generar un consumo aleatorio entre 0.5 y 10 kWh
        const consumo = Math.round((0.5 + Math.random() * 9.5) * 100) / 100;

        resultado.push({
          id: Date.now() + Math.floor(Math.random() * 10000) + i,
          id_sede_fk: id,
          timestamp_utc: timestamp.toISOString(),
          consumo_kwh: consumo,
          fecha_recepcion_utc: new Date().toISOString(),
          procesado: true
        } as LecturaEnergia);
      }
    });

    // Ordenar por timestamp, más recientes primero
    return resultado.sort((a, b) =>
      new Date(b.timestamp_utc).getTime() - new Date(a.timestamp_utc).getTime()
    );
  }
}
