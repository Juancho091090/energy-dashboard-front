export interface ConsumoHora {
  id: number;
  id_sede_fk: number;
  hora_inicio_utc: string;
  consumo_total_kwh: number;
  numero_lecturas: number;
  consumo_promedio_kwh?: number;
  fecha_procesamiento_utc: string;
  sede?: any; // Podríamos también referenciar al modelo Sede directamente
}
