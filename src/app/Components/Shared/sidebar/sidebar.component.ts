// src/app/components/shared/sidebar/sidebar.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './sidebar.component.html',
  styles: [`
    .sidebar {
      width: 260px;
      height: 100%;
      background-color: #fff;
      border-right: 1px solid rgba(0, 0, 0, 0.12);
      overflow-y: auto;
    }

    .logo-container {
      padding: 16px;
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
    }

    .logo {
      display: flex;
      align-items: center;
      color: #3f51b5;
    }

    .logo span {
      margin-left: 8px;
      font-weight: 500;
      font-size: 18px;
    }

    .section-title {
      padding: 16px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.54);
    }

    .active-link {
      background-color: rgba(63, 81, 181, 0.1);
      color: #3f51b5;
    }

    mat-icon {
      color: #616161;
    }

    .active-link mat-icon {
      color: #3f51b5;
    }
  `]
})
export class SidebarComponent {}
