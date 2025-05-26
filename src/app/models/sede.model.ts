export interface Sede {
  id: number;
  nombre_sede: string;
  id_localidad: string;
  lat?: number;
  lon?: number;
  fecha_creacion_utc: string;
  fecha_actualizacion_utc: string;
}
