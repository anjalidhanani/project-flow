import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { ReportService } from '../services/report.service';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule
  ],
  template: `
    <div class="report-dashboard">
      <div class="dashboard-header">
        <h1>Reports Dashboard</h1>
        <p>Get insights into your project performance and team productivity</p>
      </div>

      <div class="summary-cards" *ngIf="dashboardSummary">
        <mat-grid-list cols="4" rowHeight="120px" gutterSize="16px">
          <mat-grid-tile>
            <mat-card class="summary-card">
              <mat-card-content>
                <div class="card-icon">
                  <mat-icon>folder</mat-icon>
                </div>
                <div class="card-info">
                  <h3>{{ dashboardSummary.totalProjects }}</h3>
                  <p>Total Projects</p>
                </div>
              </mat-card-content>
            </mat-card>
          </mat-grid-tile>
          
          <mat-grid-tile>
            <mat-card class="summary-card">
              <mat-card-content>
                <div class="card-icon">
                  <mat-icon>task</mat-icon>
                </div>
                <div class="card-info">
                  <h3>{{ dashboardSummary.totalTasks }}</h3>
                  <p>Total Tasks</p>
                </div>
              </mat-card-content>
            </mat-card>
          </mat-grid-tile>
          
          <mat-grid-tile>
            <mat-card class="summary-card">
              <mat-card-content>
                <div class="card-icon">
                  <mat-icon>check_circle</mat-icon>
                </div>
                <div class="card-info">
                  <h3>{{ dashboardSummary.completedTasks }}</h3>
                  <p>Completed Tasks</p>
                </div>
              </mat-card-content>
            </mat-card>
          </mat-grid-tile>
          
          <mat-grid-tile>
            <mat-card class="summary-card">
              <mat-card-content>
                <div class="card-icon">
                  <mat-icon>people</mat-icon>
                </div>
                <div class="card-info">
                  <h3>{{ dashboardSummary.activeUsers }}</h3>
                  <p>Active Users</p>
                </div>
              </mat-card-content>
            </mat-card>
          </mat-grid-tile>
        </mat-grid-list>
      </div>

      <div class="report-categories">
        <h2>Report Categories</h2>
        <div class="category-grid">
          <mat-card class="category-card" routerLink="/reports/project-progress">
            <mat-card-header>
              <mat-icon mat-card-avatar>trending_up</mat-icon>
              <mat-card-title>Project Progress</mat-card-title>
              <mat-card-subtitle>Track project completion and milestones</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>View detailed progress reports for all your projects including completion rates, overdue tasks, and timeline analysis.</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="category-card" routerLink="/reports/task-analytics">
            <mat-card-header>
              <mat-icon mat-card-avatar>analytics</mat-icon>
              <mat-card-title>Task Analytics</mat-card-title>
              <mat-card-subtitle>Analyze task patterns and productivity</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Get insights into task completion trends, priority distributions, and team productivity metrics.</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="category-card" routerLink="/reports/user-activity">
            <mat-card-header>
              <mat-icon mat-card-avatar>person_search</mat-icon>
              <mat-card-title>User Activity</mat-card-title>
              <mat-card-subtitle>Monitor team member contributions</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Track individual user activity, task assignments, and contribution levels across projects.</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="category-card" routerLink="/reports/custom">
            <mat-card-header>
              <mat-icon mat-card-avatar>tune</mat-icon>
              <mat-card-title>Custom Reports</mat-card-title>
              <mat-card-subtitle>Create tailored reports</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Build custom reports with specific filters, date ranges, and export options to meet your needs.</p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .report-dashboard {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 32px;
      text-align: center;
    }

    .dashboard-header h1 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .dashboard-header p {
      color: #666;
      font-size: 16px;
    }

    .summary-cards {
      margin-bottom: 32px;
    }

    .summary-card {
      height: 100%;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
    }

    .summary-card mat-card-content {
      display: flex;
      align-items: center;
      padding: 16px;
      height: 100%;
    }

    .card-icon {
      margin-right: 16px;
    }

    .card-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #1976d2;
    }

    .card-info h3 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .card-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .report-categories {
      margin-bottom: 32px;
    }

    .report-categories h2 {
      margin-bottom: 24px;
      color: #333;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .category-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .category-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }


    @media (max-width: 768px) {
      .summary-cards mat-grid-list {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      
      .category-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReportDashboardComponent implements OnInit {
  dashboardSummary: any = null;

  constructor(private reportService: ReportService) {}

  ngOnInit() {
    this.loadDashboardSummary();
  }

  loadDashboardSummary() {
    this.reportService.getDashboardSummary().subscribe({
      next: (data) => {
        this.dashboardSummary = data;
      },
      error: (error) => {
        console.error('Error loading dashboard summary:', error);
      }
    });
  }

}
