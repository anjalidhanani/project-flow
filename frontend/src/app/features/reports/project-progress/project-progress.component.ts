import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { ReportService, ProjectProgressReport } from '../services/report.service';
import { ProjectService, Project } from '../../../core/services/project.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-progress',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatChipsModule
  ],
  template: `
    <div class="project-progress">
      <div class="header">
        <div class="header-left">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>Project Progress Reports</h1>
        </div>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="exportReport('pdf')">
            <mat-icon>picture_as_pdf</mat-icon>
            Export PDF
          </button>
          <button mat-raised-button color="accent" (click)="exportReport('csv')">
            <mat-icon>table_chart</mat-icon>
            Export CSV
          </button>
        </div>
      </div>

      <div class="filters">
        <mat-card>
          <mat-card-content>
            <mat-form-field>
              <mat-label>Filter by Projects</mat-label>
              <mat-select multiple [(value)]="selectedProjects" (selectionChange)="loadReports()">
                <mat-option *ngFor="let project of availableProjects" [value]="project.id">
                  {{ project.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="progress-overview" *ngIf="reports.length > 0">
        <div class="overview-cards">
          <mat-card class="overview-card">
            <mat-card-content>
              <h3>{{ getTotalProjects() }}</h3>
              <p>Total Projects</p>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="overview-card">
            <mat-card-content>
              <h3>{{ getAverageCompletion() }}%</h3>
              <p>Average Completion</p>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="overview-card">
            <mat-card-content>
              <h3>{{ getTotalOverdueTasks() }}</h3>
              <p>Overdue Tasks</p>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="overview-card">
            <mat-card-content>
              <h3>{{ getOnTimeProjects() }}</h3>
              <p>On-Time Projects</p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <div class="progress-reports">
        <mat-card *ngFor="let report of reports" class="project-card">
          <mat-card-header>
            <mat-card-title>{{ report.projectName }}</mat-card-title>
            <mat-card-subtitle>
              Created: {{ report.createdAt | date:'mediumDate' }}
              <span *ngIf="report.deadline"> | Deadline: {{ report.deadline | date:'mediumDate' }}</span>
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="progress-section">
              <div class="progress-header">
                <span>Overall Progress</span>
                <span class="percentage">{{ report.completionPercentage }}%</span>
              </div>
              <mat-progress-bar 
                mode="determinate" 
                [value]="report.completionPercentage"
                [color]="getProgressColor(report.completionPercentage)">
              </mat-progress-bar>
            </div>

            <div class="task-breakdown">
              <div class="breakdown-item">
                <mat-chip-set>
                  <mat-chip color="primary">
                    <mat-icon>check_circle</mat-icon>
                    Completed: {{ report.completedTasks }}
                  </mat-chip>
                  <mat-chip color="accent">
                    <mat-icon>schedule</mat-icon>
                    In Progress: {{ report.inProgressTasks }}
                  </mat-chip>
                  <mat-chip>
                    <mat-icon>radio_button_unchecked</mat-icon>
                    Pending: {{ report.pendingTasks }}
                  </mat-chip>
                  <mat-chip color="warn" *ngIf="report.overdueTasks > 0">
                    <mat-icon>warning</mat-icon>
                    Overdue: {{ report.overdueTasks }}
                  </mat-chip>
                </mat-chip-set>
              </div>
            </div>

            <div class="metrics">
              <div class="metric">
                <mat-icon>task</mat-icon>
                <div class="metric-content">
                  <span class="metric-label">Total Tasks</span>
                  <span class="metric-value">{{ report.totalTasks }}</span>
                </div>
              </div>
              
              <div class="metric">
                <mat-icon>timer</mat-icon>
                <div class="metric-content">
                  <span class="metric-label">Avg. Task Duration</span>
                  <span class="metric-value">{{ report.averageTaskDuration }} days</span>
                </div>
              </div>
            </div>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-button color="primary">View Details</button>
            <button mat-button>View Tasks</button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="empty-state" *ngIf="reports.length === 0 && !loading">
        <mat-card>
          <mat-card-content>
            <div class="empty-content">
              <mat-icon>assessment</mat-icon>
              <h3>No Progress Reports Available</h3>
              <p>There are no project progress reports to display. Make sure you have projects with tasks assigned.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .project-progress {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
      background: #fafafa;
      min-height: 100vh;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding: 24px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .back-button {
      color: #666;
      width: 48px;
      height: 48px;
    }

    .back-button:hover {
      color: #1976d2;
      background: rgba(25, 118, 210, 0.08);
    }

    .header h1 {
      margin: 0;
      color: #1a1a1a;
      font-size: 28px;
      font-weight: 500;
      letter-spacing: -0.5px;
    }

    .actions {
      display: flex;
      gap: 16px;
    }

    .actions button {
      height: 44px;
      padding: 0 24px;
      border-radius: 8px;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
    }

    .filters {
      margin-bottom: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .filters mat-card {
      border-radius: 12px;
      box-shadow: none;
      border: 1px solid #e8e8e8;
    }

    .filters mat-form-field {
      width: 320px;
      margin: 8px 0;
    }

    .progress-overview {
      margin-bottom: 48px;
    }

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 24px;
    }

    .overview-card {
      text-align: center;
      padding: 32px 24px;
      border-radius: 16px;
      background: linear-gradient(135deg, #fff 0%, #f8f9ff 100%);
      border: 1px solid #e8e8e8;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }

    .overview-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .overview-card h3 {
      margin: 0 0 12px 0;
      font-size: 36px;
      font-weight: 700;
      color: #1976d2;
      line-height: 1;
    }

    .overview-card p {
      margin: 0;
      color: #666;
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .progress-reports {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .project-card {
      border-radius: 16px;
      background: white;
      border: 1px solid #e8e8e8;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .project-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      border-color: #1976d2;
    }

    .project-card mat-card-header {
      padding: 24px 24px 16px 24px;
      background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%);
    }

    .project-card mat-card-title {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .project-card mat-card-subtitle {
      color: #666;
      font-size: 13px;
      line-height: 1.4;
    }

    .project-card mat-card-content {
      padding: 24px;
    }

    .progress-section {
      margin-bottom: 32px;
      padding: 20px;
      background: #f8f9ff;
      border-radius: 12px;
      border: 1px solid #e3f2fd;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .progress-header span:first-child {
      font-weight: 600;
      color: #333;
      font-size: 15px;
    }

    .percentage {
      font-weight: 700;
      color: #1976d2;
      font-size: 18px;
    }

    .task-breakdown {
      margin-bottom: 32px;
    }

    .breakdown-item {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }

    .breakdown-item mat-chip {
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
    }

    .breakdown-item mat-chip mat-icon {
      margin-right: 6px;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    }

    .metric mat-icon {
      color: #1976d2;
      background: rgba(25, 118, 210, 0.1);
      padding: 8px;
      border-radius: 8px;
      font-size: 20px;
      width: 36px;
      height: 36px;
    }

    .metric-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .metric-value {
      font-weight: 700;
      color: #1a1a1a;
      font-size: 16px;
    }

    .project-card mat-card-actions {
      padding: 16px 24px 24px 24px;
      gap: 12px;
    }

    .project-card mat-card-actions button {
      border-radius: 8px;
      font-weight: 500;
      text-transform: none;
      padding: 8px 20px;
    }

    .empty-state {
      margin-top: 80px;
    }

    .empty-state mat-card {
      border-radius: 16px;
      border: 2px dashed #ddd;
      background: white;
    }

    .empty-content {
      text-align: center;
      padding: 64px 32px;
    }

    .empty-content mat-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #bbb;
      margin-bottom: 24px;
    }

    .empty-content h3 {
      margin: 0 0 16px 0;
      color: #555;
      font-size: 20px;
      font-weight: 600;
    }

    .empty-content p {
      margin: 0;
      color: #888;
      font-size: 15px;
      line-height: 1.5;
      max-width: 400px;
      margin: 0 auto;
    }

    @media (max-width: 768px) {
      .project-progress {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 20px;
        padding: 16px 0;
      }

      .header h1 {
        font-size: 24px;
      }

      .actions {
        justify-content: center;
        flex-wrap: wrap;
      }

      .overview-cards {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .overview-card {
        padding: 24px 16px;
      }

      .overview-card h3 {
        font-size: 28px;
      }

      .metrics {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .filters mat-form-field {
        width: 100%;
      }

      .progress-reports {
        gap: 24px;
      }

      .project-card mat-card-content {
        padding: 16px;
      }

      .progress-section {
        padding: 16px;
        margin-bottom: 24px;
      }
    }

    @media (max-width: 480px) {
      .overview-cards {
        grid-template-columns: 1fr;
      }

      .breakdown-item {
        justify-content: center;
      }

      .actions {
        flex-direction: column;
      }
    }
  `]
})
export class ProjectProgressComponent implements OnInit {
  reports: ProjectProgressReport[] = [];
  selectedProjects: string[] = [];
  availableProjects: any[] = [];
  loading = false;

  constructor(
    private reportService: ReportService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAvailableProjects();
    this.loadReports();
  }

  loadAvailableProjects() {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.availableProjects = response.projects.map(project => ({
          id: project._id,
          name: project.name
        }));
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  loadReports() {
    this.loading = true;
    this.reportService.getProjectProgressReports(this.selectedProjects.length > 0 ? this.selectedProjects : undefined)
      .subscribe({
        next: (data) => {
          this.reports = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading progress reports:', error);
          this.loading = false;
        }
      });
  }

  exportReport(format: 'pdf' | 'csv') {
    this.reportService.exportReport('project-progress', format, {
      projectIds: this.selectedProjects
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `project-progress-report.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting report:', error);
      }
    });
  }

  getTotalProjects(): number {
    return this.reports.length;
  }

  getAverageCompletion(): number {
    if (this.reports.length === 0) return 0;
    const total = this.reports.reduce((sum, report) => sum + report.completionPercentage, 0);
    return Math.round(total / this.reports.length);
  }

  getTotalOverdueTasks(): number {
    return this.reports.reduce((sum, report) => sum + report.overdueTasks, 0);
  }

  getOnTimeProjects(): number {
    return this.reports.filter(report => report.overdueTasks === 0).length;
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 80) return 'primary';
    if (percentage >= 50) return 'accent';
    return 'warn';
  }

  goBack() {
    this.router.navigate(['/reports']);
  }
}
