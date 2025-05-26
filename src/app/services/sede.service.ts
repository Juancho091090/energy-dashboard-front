import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { Sede } from '../models/sede.model';

@Injectable({
  providedIn: 'root'
})
export class SedeService {

  private apiUrl = environment.apiUrl;
  private endpoint = '/sedes';

  constructor(private http: HttpClient) { }

  private getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Obtiene todas las sedes
   */
  getSedes(): Observable<Sede[]> {
    return this.http.get<Sede[]>(`${this.apiUrl}${this.endpoint}`, { headers: this.getHeaders() });
  }

  /**
   * Obtiene una sede por su ID
   */
  getSedeById(id: number): Observable<Sede> {
    return this.http.get<Sede>(`${this.apiUrl}${this.endpoint}/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Crea una nueva sede
   */
  createSede(sede: Sede): Observable<Sede> {
    return this.http.post<Sede>(`${this.apiUrl}${this.endpoint}`, sede, { headers: this.getHeaders() });
  }

  /**
   * Actualiza una sede existente
   */
  updateSede(id: number, sede: Sede): Observable<Sede> {
    return this.http.put<Sede>(`${this.apiUrl}${this.endpoint}/${id}`, sede, { headers: this.getHeaders() });
  }

  /**
   * Elimina una sede
   */
  deleteSede(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${this.endpoint}/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Obtiene las sedes agrupadas por localidad
   */
  getSedesByLocalidad(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${this.endpoint}/by-localidad`, { headers: this.getHeaders() });
  }

  /**
   * Obtiene estadísticas generales de todas las sedes
   */
  getEstadisticasSedes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${this.endpoint}/estadisticas`, { headers: this.getHeaders() });
  }
}
