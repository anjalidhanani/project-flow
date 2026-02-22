import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { ReportService, TaskAnalyticsReport, CustomReportFilter } from '../services/report.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task-analytics',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatChipsModule,
    MatTabsModule
  ],
  template: `
    <div class="task-analytics">
      <div class="header">
        <div class="header-left">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>Task Analytics</h1>
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
          <mat-card-header>
            <mat-card-title>Filters</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="filterForm" class="filter-form">
              <div class="filter-row">
                <mat-form-field>
                  <mat-label>Start Date</mat-label>
                  <input matInput [matDatepicker]="startPicker" formControlName="startDate">
                  <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                  <mat-datepicker #startPicker></mat-datepicker>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>End Date</mat-label>
                  <input matInput [matDatepicker]="endPicker" formControlName="endDate">
                  <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                  <mat-datepicker #endPicker></mat-datepicker>
                </mat-form-field>

                <button mat-raised-button color="primary" (click)="applyFilters()">
                  Apply Filters
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="analytics-overview" *ngIf="analytics">
        <div class="overview-cards">
          <mat-card class="metric-card">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>task</mat-icon>
                <h3>{{ analytics.totalTasks }}</h3>
              </div>
              <p>Total Tasks</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="metric-card">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>check_circle</mat-icon>
                <h3>{{ analytics.completedTasks }}</h3>
              </div>
              <p>Completed Tasks</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="metric-card">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>schedule</mat-icon>
                <h3>{{ analytics.inProgressTasks }}</h3>
              </div>
              <p>In Progress</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="metric-card">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>warning</mat-icon>
                <h3>{{ analytics.overdueTasks }}</h3>
              </div>
              <p>Overdue Tasks</p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <mat-tab-group *ngIf="analytics" class="analytics-tabs">
        <mat-tab label="Priority Distribution">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Tasks by Priority</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="priority-chart">
                  <div class="priority-item">
                    <div class="priority-bar high" [style.width.%]="getPriorityPercentage('high')"></div>
                    <div class="priority-info">
                      <span class="priority-label">High Priority</span>
                      <span class="priority-count">{{ analytics.tasksByPriority.high }}</span>
                    </div>
                  </div>
                  
                  <div class="priority-item">
                    <div class="priority-bar medium" [style.width.%]="getPriorityPercentage('medium')"></div>
                    <div class="priority-info">
                      <span class="priority-label">Medium Priority</span>
                      <span class="priority-count">{{ analytics.tasksByPriority.medium }}</span>
                    </div>
                  </div>
                  
                  <div class="priority-item">
                    <div class="priority-bar low" [style.width.%]="getPriorityPercentage('low')"></div>
                    <div class="priority-info">
                      <span class="priority-label">Low Priority</span>
                      <span class="priority-count">{{ analytics.tasksByPriority.low }}</span>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab label="Project Distribution">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Tasks by Project</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="project-list">
                  <div class="project-item" *ngFor="let project of analytics.tasksByProject">
                    <div class="project-info">
                      <span class="project-name">{{ project.projectName }}</span>
                      <span class="task-count">{{ project.taskCount }} tasks</span>
                    </div>
                    <div class="project-bar" [style.width.%]="getProjectPercentage(project.taskCount)"></div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab label="Productivity Trends">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Productivity Timeline</mat-card-title>
                <mat-card-subtitle>Tasks created vs completed over time</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="productivity-metrics">
                  <div class="metric">
                    <mat-icon>timer</mat-icon>
                    <div class="metric-content">
                      <span class="metric-label">Average Completion Time</span>
                      <span class="metric-value">{{ analytics.averageCompletionTime }} days</span>
                    </div>
                  </div>
                </div>
                
                <div class="trend-chart">
                  <div class="trend-item" *ngFor="let trend of analytics.productivityTrends">
                    <div class="trend-date">{{ trend.date | date:'shortDate' }}</div>
                    <div class="trend-bars">
                      <div class="trend-bar created" [style.height.px]="getTrendHeight(trend.tasksCreated, 'created')">
                        <span class="trend-value">{{ trend.tasksCreated }}</span>
                      </div>
                      <div class="trend-bar completed" [style.height.px]="getTrendHeight(trend.tasksCompleted, 'completed')">
                        <span class="trend-value">{{ trend.tasksCompleted }}</span>
                      </div>
                    </div>
                    <div class="trend-legend">
                      <span class="legend-item created">Created</span>
                      <span class="legend-item completed">Completed</span>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>

      <div class="empty-state" *ngIf="!analytics && !loading">
        <mat-card>
          <mat-card-content>
            <div class="empty-content">
              <mat-icon>analytics</mat-icon>
              <h3>No Analytics Data Available</h3>
              <p>There is no task analytics data to display. Make sure you have tasks in your projects.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .task-analytics {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      color: #666;
    }

    .back-button:hover {
      color: #1976d2;
    }

    .header h1 {
      margin: 0;
      color: #333;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .filters {
      margin-bottom: 24px;
    }

    .filter-form {
      display: flex;
      flex-direction: column;
    }

    .filter-row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filter-row mat-form-field {
      min-width: 200px;
    }

    .analytics-overview {
      margin-bottom: 32px;
    }

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .metric-card {
      text-align: center;
    }

    .metric-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .metric-header mat-icon {
      color: #1976d2;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .metric-header h3 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
      color: #333;
    }

    .metric-card p {
      margin: 0;
      color: #666;
    }

    .analytics-tabs {
      margin-bottom: 32px;
    }

    .tab-content {
      padding: 24px 0;
    }

    .priority-chart {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .priority-item {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .priority-bar {
      height: 24px;
      border-radius: 12px;
      min-width: 40px;
      transition: width 0.3s ease;
    }

    .priority-bar.high {
      background-color: #f44336;
    }

    .priority-bar.medium {
      background-color: #ff9800;
    }

    .priority-bar.low {
      background-color: #4caf50;
    }

    .priority-info {
      display: flex;
      flex-direction: column;
      min-width: 120px;
    }

    .priority-label {
      font-weight: 500;
    }

    .priority-count {
      color: #666;
      font-size: 14px;
    }

    .project-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .project-item {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .project-info {
      display: flex;
      flex-direction: column;
      min-width: 200px;
    }

    .project-name {
      font-weight: 500;
    }

    .task-count {
      color: #666;
      font-size: 14px;
    }

    .project-bar {
      height: 24px;
      background-color: #1976d2;
      border-radius: 12px;
      min-width: 40px;
      transition: width 0.3s ease;
    }

    .productivity-metrics {
      margin-bottom: 32px;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .metric mat-icon {
      color: #666;
    }

    .metric-content {
      display: flex;
      flex-direction: column;
    }

    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .metric-value {
      font-weight: 600;
      color: #333;
    }

    .trend-chart {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding: 16px 0;
    }

    .trend-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 80px;
    }

    .trend-date {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .trend-bars {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 100px;
      margin-bottom: 8px;
    }

    .trend-bar {
      width: 20px;
      border-radius: 4px 4px 0 0;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      min-height: 10px;
    }

    .trend-bar.created {
      background-color: #2196f3;
    }

    .trend-bar.completed {
      background-color: #4caf50;
    }

    .trend-value {
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px;
    }

    .trend-legend {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .legend-item {
      font-size: 10px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .legend-item::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .legend-item.created::before {
      background-color: #2196f3;
    }

    .legend-item.completed::before {
      background-color: #4caf50;
    }

    .empty-state {
      margin-top: 48px;
    }

    .empty-content {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-content mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-content h3 {
      margin: 0 0 16px 0;
      color: #666;
    }

    .empty-content p {
      margin: 0;
      color: #999;
    }

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .actions {
        justify-content: center;
      }

      .filter-row {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-row mat-form-field {
        min-width: unset;
      }

      .priority-item, .project-item {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .priority-info, .project-info {
        min-width: unset;
      }
    }
  `]
})
export class TaskAnalyticsComponent implements OnInit {
  analytics: TaskAnalyticsReport | null = null;
  loading = false;
  filterForm: FormGroup;

  constructor(
    private reportService: ReportService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      startDate: [null],
      endDate: [null]
    });
  }

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.loading = true;
    const filters = this.buildFilters();
    
    this.reportService.getTaskAnalytics(filters).subscribe({
      next: (data) => {
        this.analytics = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading task analytics:', error);
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.loadAnalytics();
  }

  exportReport(format: 'pdf' | 'csv') {
    const filters = this.buildFilters();
    this.reportService.exportReport('task-analytics', format, filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `task-analytics-report.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting report:', error);
      }
    });
  }

  private buildFilters(): CustomReportFilter | undefined {
    const formValue = this.filterForm.value;
    if (!formValue.startDate && !formValue.endDate) {
      return undefined;
    }

    return {
      dateRange: {
        startDate: formValue.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: formValue.endDate || new Date()
      }
    };
  }

  getPriorityPercentage(priority: 'high' | 'medium' | 'low'): number {
    if (!this.analytics) return 0;
    const total = this.analytics.tasksByPriority.high + 
                  this.analytics.tasksByPriority.medium + 
                  this.analytics.tasksByPriority.low;
    if (total === 0) return 0;
    return (this.analytics.tasksByPriority[priority] / total) * 100;
  }

  getProjectPercentage(taskCount: number): number {
    if (!this.analytics) return 0;
    const maxTasks = Math.max(...this.analytics.tasksByProject.map(p => p.taskCount));
    if (maxTasks === 0) return 0;
    return (taskCount / maxTasks) * 100;
  }

  getTrendHeight(value: number, type: 'created' | 'completed'): number {
    if (!this.analytics) return 10;
    const maxValue = Math.max(
      ...this.analytics.productivityTrends.map(t => Math.max(t.tasksCreated, t.tasksCompleted))
    );
    if (maxValue === 0) return 10;
    return Math.max(10, (value / maxValue) * 80);
  }

  goBack() {
    this.router.navigate(['/reports']);
  }
}
