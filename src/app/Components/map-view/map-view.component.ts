// src/app/components/map-view/map-view.component.ts

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LecturaEnergiaService } from '../../services/lectura-energia.service';
import { SedeService } from '../../services/sede.service';
import { ConsumoService } from '../../services/consumo-service.service';
import { Sede } from '../../models/sede.model';
import { LecturaEnergia } from '../../models/lectura-energia.model';

// Importaciones de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

// Importar los componentes compartidos
import { NavbarComponent } from '../Shared/navbar/navbar.component';
import { SidebarComponent } from '../Shared/sidebar/sidebar.component';
import { FooterComponent } from '../Shared/footer/footer.component';

// Importar Leaflet
import * as L from 'leaflet';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    NavbarComponent,
    FooterComponent
],
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss']
})
export class MapViewComponent implements OnInit, AfterViewInit {
  sedes: Sede[] = [];
  ultimasLecturas: { [key: number]: LecturaEnergia } = {};

  loading = true;
  error = '';
  mapInitialized = false;
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];

  // Centro aproximado de Suba, Bogotá
  private subaCenter = {
    lat: 4.7439,
    lon: -74.0930
  };

  constructor(
    private router: Router,
    private lecturaService: LecturaEnergiaService,
    private sedeService: SedeService,
    private consumoService: ConsumoService
  ) {
    console.log('🚀 Inicializando componente de mapa');
    // Generar datos de colegios simulados
    this.generarColegiosFicticios();
  }

  ngOnInit(): void {
    console.log('🔍 Iniciando carga de datos para el mapa...');
    // Simulamos carga de datos
    setTimeout(() => {
      // Generar datos de consumo simulados
      this.generarConsumosFicticios();
      this.loading = false;
      console.log('✅ Datos del mapa cargados exitosamente');
    }, 1000);
  }

  ngAfterViewInit(): void {
    // Inicializar el mapa después de un tiempo para asegurar que el DOM está listo
    setTimeout(() => {
      this.inicializarMapa();
    }, 500);
  }

  // Generar 54 colegios ficticios en el área de Suba
  generarColegiosFicticios(): void {
    const nombresPrefijos = [
      'Colegio', 'IED', 'Institución Educativa', 'Escuela', 'Centro Educativo', 'Liceo'
    ];

    const nombresSufijos = [
      'Nueva Suba', 'La Gaitana', 'Tibabuyes', 'El Prado', 'La Colina', 'Tuna Alta',
      'Compartir', 'Villa María', 'San José', 'Los Cerezos', 'La Toscana', 'Gerardo Paredes',
      'Juan Ramón Jiménez', 'Alberto Lleras', 'Simón Bolívar', 'República de Colombia',
      'Nueva Granada', 'Ventiún Ángeles', 'La Paz', 'Delia Zapata', 'Ramón de Zubiria',
      'Gustavo Morales', 'Virginia Gutiérrez', 'Nicolás Buenaventura', 'Hunza',
      'Nueva Colombia', 'La Chucua', 'El Salitre', 'Santa Rosa', 'Pinar del Río'
    ];

    // Radio aproximado en grados para la distribución aleatoria (área de Suba)
    const latRadius = 0.04;  // Aproximadamente 4.4 km en latitud
    const lonRadius = 0.04;  // Aproximadamente 4.4 km en longitud

    this.sedes = [];

    for (let i = 1; i <= 54; i++) {
      // Generar nombres aleatorios combinando prefijos y sufijos
      const prefijo = nombresPrefijos[Math.floor(Math.random() * nombresPrefijos.length)];
      const sufijo = nombresSufijos[Math.floor(Math.random() * nombresSufijos.length)];
      const nombre = `${prefijo} ${sufijo} ${i}`;

      // Generar coordenadas aleatorias dentro del área de Suba
      const lat = this.subaCenter.lat + (Math.random() * 2 - 1) * latRadius;
      const lon = this.subaCenter.lon + (Math.random() * 2 - 1) * lonRadius;

      this.sedes.push({
        id: i,
        nombre_sede: nombre,
        lat,
        lon
      } as Sede);
    }

    console.log(`✅ Generados ${this.sedes.length} colegios ficticios`);
  }

  // Generar datos de consumo aleatorios para cada sede
  generarConsumosFicticios(): void {
    this.sedes.forEach(sede => {
      // Generar datos de consumo aleatorios entre 0 y 600 kWh
      const consumo = Math.floor(Math.random() * 600);

      this.ultimasLecturas[sede.id] = {
        id: sede.id * 1000,
        id_sede_fk: sede.id,
        timestamp_utc: new Date().toISOString(),
        consumo_kwh: consumo,
        fecha_recepcion_utc: new Date().toISOString(),
        procesado: true
      } as LecturaEnergia;
    });

    console.log('✅ Datos de consumo ficticios generados correctamente');
  }

  inicializarMapa(): void {
    console.log('🔄 Iniciando inicialización del mapa');

    try {
      // Verificar que el elemento existe
      const mapElement = document.getElementById('map');
      console.log('🔍 Buscando elemento del mapa en el DOM');

      if (!mapElement) {
        console.error('❌ Elemento mapa no encontrado en el DOM');
        return;
      }

      // Crear el mapa centrado en Suba, Bogotá
      this.map = L.map('map').setView([this.subaCenter.lat, this.subaCenter.lon], 13);

      // Añadir capa base de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);

      // Dibujar polígono de Suba
      this.dibujarPoligonoSuba();

      // Marcar como inicializado
      this.mapInitialized = true;

      // Añadir marcadores para los colegios
      this.actualizarMarcadoresMapa();

      console.log('✅ Mapa inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar el mapa:', error);
    }
  }

  dibujarPoligonoSuba(): void {
    if (!this.map) {
      console.error('❌ No se puede dibujar el polígono porque el mapa no está inicializado');
      return;
    }

    // Coordenadas aproximadas del polígono que delimita Suba
    const subaPoligono: L.LatLngTuple[] = [
      [4.7750, -74.1250], // Noreste
      [4.7920, -74.0850], // Norte
      [4.7680, -74.0450], // Noreste
      [4.7250, -74.0310], // Este
      [4.6850, -74.0450], // Sureste
      [4.6750, -74.0850], // Sur
      [4.6950, -74.1250], // Suroeste
      [4.7350, -74.1350], // Oeste
      [4.7750, -74.1250]  // Cierre del polígono
    ];

    try {
      L.polygon(subaPoligono, {
        color: '#3f51b5',
        fillColor: '#3f51b5',
        fillOpacity: 0.1,
        weight: 2
      }).addTo(this.map);
      console.log('✅ Polígono de Suba añadido con éxito');
    } catch (error) {
      console.error('❌ Error al añadir el polígono de Suba:', error);
    }
  }

  actualizarMarcadoresMapa(): void {
    if (!this.map) {
      console.error('❌ No se puede actualizar marcadores porque el mapa no está inicializado');
      return;
    }

    console.log(`🔄 Actualizando marcadores para ${this.sedes.length} sedes`);

    // Limpiar marcadores existentes
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    // Corregir el problema de los íconos de Leaflet
    // Este paso es crucial - configura el directorio de imágenes para Leaflet
    L.Icon.Default.imagePath = 'assets/';

    // Añadir marcadores para cada sede (ahora todos los marcadores son verdes)
    this.sedes.forEach(sede => {
      if (sede.lat && sede.lon) {
        try {
          // Todos los marcadores son verdes (medidores de energía)
          const iconColor = '#4CAF50';

          // Crear icono personalizado
          const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${iconColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 1px 1px 3px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          // Crear marcador y añadirlo al mapa
          const marker = L.marker([sede.lat, sede.lon], { icon }).addTo(this.map!);

          // Añadir popup con información
          const consumo = this.ultimasLecturas[sede.id]?.consumo_kwh || 'No disponible';
          marker.bindPopup(`
            <strong>${sede.nombre_sede}</strong><br>
            Consumo: ${consumo} kWh<br>
            <button class="popup-button">Ver Detalles</button>
          `);

          // Añadir evento al popup para navegar a los detalles
          marker.on('popupopen', (e) => {
            setTimeout(() => {
              const button = document.querySelector('.popup-button');
              if (button) {
                button.addEventListener('click', () => {
                  this.verDetalleSede(sede.id);
                });
              }
            }, 10);
          });

          this.markers.push(marker);
        } catch (error) {
          console.error(`❌ Error al añadir marcador para sede ${sede.id}:`, error);
        }
      }
    });

    // Ajustar la vista del mapa para mostrar todos los marcadores
    if (this.markers.length > 0) {
      try {
        const group = L.featureGroup(this.markers);
        this.map.fitBounds(group.getBounds().pad(0.1));
        console.log(`✅ Añadidos ${this.markers.length} marcadores al mapa`);
      } catch (error) {
        console.error('❌ Error al ajustar la vista del mapa:', error);
      }
    } else {
      console.warn('⚠️ No se han añadido marcadores al mapa');
    }
  }

  centerMap(): void {
    if (this.map && this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
      console.log('🔄 Centrando mapa en los marcadores');
    } else if (this.map) {
      // Centro en Suba si no hay marcadores
      this.map.setView([this.subaCenter.lat, this.subaCenter.lon], 13);
      console.log('🔄 Centrando mapa en Suba');
    }
  }

  zoomIn(): void {
    if (this.map) {
      this.map.setZoom(this.map.getZoom() + 1);
      console.log(`🔍 Zoom in: nivel ${this.map.getZoom()}`);
    }
  }

  zoomOut(): void {
    if (this.map) {
      this.map.setZoom(this.map.getZoom() - 1);
      console.log(`🔍 Zoom out: nivel ${this.map.getZoom()}`);
    }
  }

  verDetalleSede(sedeId: number): void {
    console.log(`🔄 Navegando a detalles de la sede #${sedeId}`);
    this.router.navigate(['/sede', sedeId]);
  }
}
