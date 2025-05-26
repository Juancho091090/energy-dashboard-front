import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Genera un análisis de consumo energético utilizando IA
   * @param sedeId ID de la sede a analizar
   * @param fechaInicio Fecha de inicio del análisis (formato ISO 8601)
   * @param fechaFin Fecha fin del análisis (formato ISO 8601)
   * @param granularidad 'hourly' o 'daily'
   * @returns Observable con el análisis en formato Markdown
   */
  generateAnalysis(
    sedeId: number | string,
    fechaInicio: string,
    fechaFin: string,
    granularidad: 'hourly' | 'daily'
  ): Observable<string> {
    // Crear parámetros para la solicitud
    const params = new HttpParams()
      .set('id_sede', sedeId.toString())
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin)
      .set('granularidad', granularidad);

    console.log(`🔍 Solicitando análisis IA para sede ${sedeId}...`);
    console.log(`Parámetros: inicio=${fechaInicio}, fin=${fechaFin}, granularidad=${granularidad}`);

    // Llamar al endpoint y retornar la respuesta como string
    return this.http.get(`${this.apiUrl}/analysis/analyze`, {
      params,
      responseType: 'text' // El resultado es Markdown (texto)
    });
  }
}
