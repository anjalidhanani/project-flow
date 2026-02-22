import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ReportService, UserActivityReport } from '../services/report.service';
import { ProjectService } from '../../../core/services/project.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-activity',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTabsModule
  ],
  template: `
    <div class="user-activity">
      <div class="header">
        <div class="header-left">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>User Activity Reports</h1>
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
              <mat-label>Filter by Users</mat-label>
              <mat-select multiple [(value)]="selectedUsers" (selectionChange)="loadReports()">
                <mat-option *ngFor="let user of availableUsers" [value]="user.id">
                  {{ user.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="activity-overview" *ngIf="reports.length > 0">
        <div class="overview-cards">
          <mat-card class="overview-card">
            <mat-card-content>
              <h3>{{ getTotalUsers() }}</h3>
              <p>Active Users</p>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="overview-card">
            <mat-card-content>
              <h3>{{ getAverageProductivity() }}%</h3>
              <p>Avg. Productivity</p>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="overview-card">
            <mat-card-content>
              <h3>{{ getTotalTasksAssigned() }}</h3>
              <p>Tasks Assigned</p>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="overview-card">
            <mat-card-content>
              <h3>{{ getTotalTasksCompleted() }}</h3>
              <p>Tasks Completed</p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <div class="user-reports">
        <mat-card *ngFor="let report of reports" class="user-card">
          <mat-card-header>
            <div mat-card-avatar class="user-avatar">
              <mat-icon>person</mat-icon>
            </div>
            <mat-card-title>{{ report.userName }}</mat-card-title>
            <mat-card-subtitle>
              Last Activity: {{ report.lastActivity | date:'medium' }}
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="productivity-section">
              <div class="productivity-header">
                <span>Productivity Score</span>
                <span class="score">{{ report.productivityScore }}%</span>
              </div>
              <mat-progress-bar 
                mode="determinate" 
                [value]="report.productivityScore"
                [color]="getProductivityColor(report.productivityScore)">
              </mat-progress-bar>
            </div>

            <div class="activity-stats">
              <div class="stat-grid">
                <div class="stat-item">
                  <mat-icon>assignment</mat-icon>
                  <div class="stat-content">
                    <span class="stat-value">{{ report.tasksAssigned }}</span>
                    <span class="stat-label">Tasks Assigned</span>
                  </div>
                </div>
                
                <div class="stat-item">
                  <mat-icon>check_circle</mat-icon>
                  <div class="stat-content">
                    <span class="stat-value">{{ report.tasksCompleted }}</span>
                    <span class="stat-label">Tasks Completed</span>
                  </div>
                </div>
                
                <div class="stat-item">
                  <mat-icon>folder</mat-icon>
                  <div class="stat-content">
                    <span class="stat-value">{{ report.projectsInvolved }}</span>
                    <span class="stat-label">Projects</span>
                  </div>
                </div>
                
                <div class="stat-item">
                  <mat-icon>comment</mat-icon>
                  <div class="stat-content">
                    <span class="stat-value">{{ report.commentsPosted }}</span>
                    <span class="stat-label">Comments</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="completion-rate">
              <div class="rate-info">
                <span>Task Completion Rate</span>
                <span class="rate-percentage">{{ getCompletionRate(report) }}%</span>
              </div>
              <div class="rate-bar">
                <div class="rate-fill" [style.width.%]="getCompletionRate(report)"></div>
              </div>
            </div>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="viewActivityTimeline(report.userId)" class="timeline-button">
              <mat-icon>timeline</mat-icon>
              Activity Timeline
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="activity-timeline" *ngIf="selectedUserTimeline">
        <mat-card class="timeline-card">
          <mat-card-header class="timeline-header-card">
            <div mat-card-avatar class="timeline-avatar">
              <mat-icon>timeline</mat-icon>
            </div>
            <mat-card-title class="timeline-title">Activity Timeline</mat-card-title>
            <mat-card-subtitle class="timeline-subtitle">{{ getSelectedUserName() }}</mat-card-subtitle>
            <button mat-icon-button (click)="closeTimeline()" class="close-button">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content class="timeline-content-wrapper">
            <div class="timeline-stats">
              <div class="stat-chip">
                <mat-icon>event</mat-icon>
                <span>{{ selectedUserTimeline.length }} Activities</span>
              </div>
              <div class="stat-chip">
                <mat-icon>schedule</mat-icon>
                <span>Last 30 Days</span>
              </div>
            </div>
            
            <div class="timeline" *ngIf="selectedUserTimeline.length > 0; else noActivity">
              <div class="timeline-item" *ngFor="let activity of selectedUserTimeline; let i = index" 
                   [class.timeline-item-fade]="true"
                   [style.animation-delay.ms]="i * 100">
                <div class="timeline-marker" [ngClass]="getActivityMarkerClass(activity.activityType)">
                  <mat-icon>{{ getActivityIcon(activity.activityType) }}</mat-icon>
                </div>
                <div class="timeline-content" [ngClass]="getActivityContentClass(activity.activityType)">
                  <div class="timeline-header">
                    <div class="activity-info">
                      <span class="activity-type">{{ formatActivityType(activity.activityType) }}</span>
                      <div class="activity-meta">
                        <mat-icon class="time-icon">access_time</mat-icon>
                        <span class="activity-date">{{ activity.date | date:'MMM d, y • h:mm a' }}</span>
                      </div>
                    </div>
                    <div class="activity-badge" [ngClass]="getActivityBadgeClass(activity.activityType)">
                      {{ getActivityBadgeText(activity.activityType) }}
                    </div>
                  </div>
                  <p class="activity-description">{{ activity.description }}</p>
                </div>
              </div>
            </div>
            
            <ng-template #noActivity>
              <div class="no-activity">
                <mat-icon>timeline</mat-icon>
                <h4>No Recent Activity</h4>
                <p>This user hasn't been active in the last 30 days.</p>
              </div>
            </ng-template>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="empty-state" *ngIf="reports.length === 0 && !loading">
        <mat-card>
          <mat-card-content>
            <div class="empty-content">
              <mat-icon>person_search</mat-icon>
              <h3>No User Activity Data</h3>
              <p>There is no user activity data to display. Make sure users are actively participating in projects.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .user-activity {
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

    .filters mat-form-field {
      width: 300px;
    }

    .activity-overview {
      margin-bottom: 32px;
    }

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .overview-card {
      text-align: center;
    }

    .overview-card h3 {
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 600;
      color: #1976d2;
    }

    .overview-card p {
      margin: 0;
      color: #666;
    }

    .user-reports {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-bottom: 32px;
    }

    .user-card {
      transition: transform 0.2s;
    }

    .user-card:hover {
      transform: translateY(-2px);
    }

    .user-avatar {
      background-color: #1976d2;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .productivity-section {
      margin-bottom: 24px;
    }

    .productivity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .score {
      font-weight: 600;
      color: #1976d2;
    }

    .activity-stats {
      margin-bottom: 24px;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 8px;
    }

    .stat-item mat-icon {
      color: #1976d2;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .completion-rate {
      margin-top: 16px;
    }

    .rate-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .rate-percentage {
      font-weight: 600;
      color: #4caf50;
    }

    .rate-bar {
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .rate-fill {
      height: 100%;
      background-color: #4caf50;
      transition: width 0.3s ease;
    }

    .timeline-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 25px;
      padding: 12px 24px;
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      transition: all 0.3s ease;
    }

    .timeline-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    }

    .timeline-button mat-icon {
      margin-right: 8px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .activity-timeline {
      margin-top: 32px;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
      overflow-y: auto;
    }

    .timeline-card {
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 16px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
      animation: slideInUp 0.3s ease-out;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .timeline-header-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      position: relative;
      padding: 24px;
    }

    .timeline-avatar {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .timeline-title {
      color: white;
      font-size: 24px;
      font-weight: 600;
    }

    .timeline-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
    }

    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .timeline-content-wrapper {
      padding: 32px;
    }

    .timeline-stats {
      display: flex;
      gap: 20px;
      margin-bottom: 40px;
      justify-content: center;
    }

    .stat-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      background: #f0f4ff;
      border: 1px solid #e3f2fd;
      border-radius: 25px;
      color: #1976d2;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .stat-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .timeline {
      position: relative;
      padding-left: 60px;
      padding-top: 20px;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 30px;
      top: 20px;
      bottom: 20px;
      width: 3px;
      background: linear-gradient(to bottom, #667eea, #764ba2);
      border-radius: 2px;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 40px;
      opacity: 0;
      animation: fadeInUp 0.6s ease-out forwards;
    }

    .timeline-item-fade {
      animation: fadeInUp 0.6s ease-out forwards;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .timeline-marker {
      position: absolute;
      left: -45px;
      top: 12px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2;
    }

    .timeline-marker mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .marker-task {
      background: linear-gradient(135deg, #4caf50, #45a049);
    }

    .marker-comment {
      background: linear-gradient(135deg, #2196f3, #1976d2);
    }

    .marker-project {
      background: linear-gradient(135deg, #ff9800, #f57c00);
    }

    .marker-default {
      background: linear-gradient(135deg, #9c27b0, #7b1fa2);
    }

    .timeline-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-left: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-left: 4px solid #e0e0e0;
      transition: all 0.3s ease;
    }

    .timeline-content:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      transform: translateX(4px);
    }

    .content-task {
      border-left-color: #4caf50;
      background: linear-gradient(135deg, #f8fff8 0%, #ffffff 100%);
    }

    .content-comment {
      border-left-color: #2196f3;
      background: linear-gradient(135deg, #f3f9ff 0%, #ffffff 100%);
    }

    .content-project {
      border-left-color: #ff9800;
      background: linear-gradient(135deg, #fff8f0 0%, #ffffff 100%);
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .activity-info {
      flex: 1;
      padding-right: 16px;
    }

    .activity-type {
      font-weight: 600;
      color: #1a1a1a;
      font-size: 16px;
      display: block;
      margin-bottom: 8px;
    }

    .activity-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #666;
    }

    .time-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .activity-date {
      font-size: 13px;
      color: #666;
    }

    .activity-badge {
      padding: 6px 14px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .badge-task {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .badge-comment {
      background: #e3f2fd;
      color: #1565c0;
    }

    .badge-project {
      background: #fff3e0;
      color: #ef6c00;
    }

    .badge-default {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .activity-description {
      margin: 0;
      color: #555;
      line-height: 1.6;
      font-size: 14px;
      padding-top: 4px;
    }

    .no-activity {
      text-align: center;
      padding: 48px 24px;
      color: #666;
    }

    .no-activity mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .no-activity h4 {
      margin: 0 0 8px 0;
      color: #555;
      font-weight: 500;
    }

    .no-activity p {
      margin: 0;
      font-size: 14px;
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

      .filters mat-form-field {
        width: 100%;
      }

      .stat-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .timeline {
        padding-left: 32px;
      }

      .timeline-marker {
        left: -24px;
        width: 24px;
        height: 24px;
      }
    }
  `]
})
export class UserActivityComponent implements OnInit {
  reports: UserActivityReport[] = [];
  selectedUsers: string[] = [];
  availableUsers: any[] = [];
  selectedUserTimeline: any[] | null = null;
  selectedUserId: string | null = null;
  loading = false;

  constructor(
    private reportService: ReportService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAvailableUsers();
    this.loadReports();
  }

  loadAvailableUsers() {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        const uniqueUsers = new Map();
        
        // Get all unique users from project members
        response.projects.forEach(project => {
          if (project.members) {
            project.members.forEach(member => {
              if (!uniqueUsers.has(member._id)) {
                uniqueUsers.set(member._id, {
                  id: member._id,
                  name: member.name
                });
              }
            });
          }
        });
        
        this.availableUsers = Array.from(uniqueUsers.values());
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  loadReports() {
    this.loading = true;
    this.reportService.getUserActivityReports(this.selectedUsers.length > 0 ? this.selectedUsers : undefined)
      .subscribe({
        next: (data) => {
          this.reports = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading user activity reports:', error);
          this.loading = false;
        }
      });
  }

  exportReport(format: 'pdf' | 'csv') {
    this.reportService.exportReport('user-activity', format, {
      userIds: this.selectedUsers
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-activity-report.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting report:', error);
      }
    });
  }

  viewUserDetails(userId: string) {
    // Navigate to user details or show more detailed view
    console.log('View user details for:', userId);
  }

  viewActivityTimeline(userId: string) {
    const user = this.reports.find(r => r.userId === userId);
    if (user) {
      this.selectedUserTimeline = user.activityTimeline;
      this.selectedUserId = userId;
    }
  }

  closeTimeline() {
    this.selectedUserTimeline = null;
    this.selectedUserId = null;
  }

  getSelectedUserName(): string {
    if (!this.selectedUserId) return '';
    const user = this.reports.find(r => r.userId === this.selectedUserId);
    return user ? user.userName : '';
  }

  getTotalUsers(): number {
    return this.reports.length;
  }

  getAverageProductivity(): number {
    if (this.reports.length === 0) return 0;
    const total = this.reports.reduce((sum, report) => sum + report.productivityScore, 0);
    return Math.round(total / this.reports.length);
  }

  getTotalTasksAssigned(): number {
    return this.reports.reduce((sum, report) => sum + report.tasksAssigned, 0);
  }

  getTotalTasksCompleted(): number {
    return this.reports.reduce((sum, report) => sum + report.tasksCompleted, 0);
  }

  getCompletionRate(report: UserActivityReport): number {
    if (report.tasksAssigned === 0) return 0;
    return Math.round((report.tasksCompleted / report.tasksAssigned) * 100);
  }

  getProductivityColor(score: number): string {
    if (score >= 80) return 'primary';
    if (score >= 60) return 'accent';
    return 'warn';
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'task_completed':
        return 'check_circle';
      case 'task_created':
        return 'add_task';
      case 'task_updated':
        return 'edit';
      case 'comment_added':
        return 'comment';
      case 'project_joined':
        return 'group_add';
      case 'project_created':
        return 'folder_open';
      default:
        return 'info';
    }
  }

  formatActivityType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getActivityMarkerClass(type: string): string {
    if (type.includes('task')) return 'marker-task';
    if (type.includes('comment')) return 'marker-comment';
    if (type.includes('project')) return 'marker-project';
    return 'marker-default';
  }

  getActivityContentClass(type: string): string {
    if (type.includes('task')) return 'content-task';
    if (type.includes('comment')) return 'content-comment';
    if (type.includes('project')) return 'content-project';
    return '';
  }

  getActivityBadgeClass(type: string): string {
    if (type.includes('task')) return 'badge-task';
    if (type.includes('comment')) return 'badge-comment';
    if (type.includes('project')) return 'badge-project';
    return 'badge-default';
  }

  getActivityBadgeText(type: string): string {
    if (type.includes('task')) return 'Task';
    if (type.includes('comment')) return 'Comment';
    if (type.includes('project')) return 'Project';
    return 'Activity';
  }

  goBack() {
    this.router.navigate(['/reports']);
  }
}
