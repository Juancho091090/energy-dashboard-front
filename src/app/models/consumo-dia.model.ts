export interface ConsumoDia {
  id: number;
  id_sede_fk: number;
  fecha_utc: string;
  consumo_total_diario_kwh: number;
  numero_horas_registradas: number;
  consumo_promedio_horario_kwh?: number;
  fecha_procesamiento_utc: string;
  sede?: any; // Podríamos también referenciar al modelo Sede directamente
}
