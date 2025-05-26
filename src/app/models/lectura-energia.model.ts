export interface LecturaEnergia {
  id: number;
  id_sede_fk: number;
  timestamp_utc: string;
  consumo_kwh: number;
  fecha_recepcion_utc: string;
  procesado: boolean;
}
