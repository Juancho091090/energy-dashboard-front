// src/app/models/sede-extended.model.ts

import { Sede } from './sede.model';

// Extender la interfaz Sede con las propiedades adicionales
export interface SedeExtended extends Sede {
  nombre: string;
  direccion: string;
  tipo: string;
  fechaInicio: Date;
}
