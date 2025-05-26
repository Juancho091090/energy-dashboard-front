import { Routes } from '@angular/router';
import { DashboardComponent } from './Components/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  {
    path: 'map',
    loadComponent: () => import('./Components/map-view/map-view.component').then(m => m.MapViewComponent)
  },
  {
    path: 'analytics',
    loadComponent: () => import('./Components/analytics/analytics.component').then(m => m.AnalyticsComponent)
  },
  {
    path: 'sede/:id',
    loadComponent: () => import('./Components/sede-detail/sede-detail.component').then(m => m.SedeDetailComponent)
  },
  { path: '**', redirectTo: '/dashboard' }
];
