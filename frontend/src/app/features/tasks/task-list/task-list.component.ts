import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';
import { TaskService, Task } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TaskEditDialogComponent } from '../task-edit-dialog/task-edit-dialog.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  template: `
    <div class="modern-task-container">
      <!-- Modern Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">My Tasks</h1>
            <p class="page-subtitle">Stay organized and get things done</p>
          </div>
          <button class="create-btn" mat-flat-button color="primary" (click)="createTask()">
            <mat-icon>add</mat-icon>
            New Task
          </button>
        </div>
        
        <!-- Modern Filters -->
        <div class="filter-bar">
          <div class="filter-chips">
            <div class="filter-group">
              <mat-form-field appearance="outline" class="compact-field">
                <mat-select [(value)]="selectedStatus" (selectionChange)="onFilterChange()" placeholder="Status">
                  <mat-option value="">All Status</mat-option>
                  <mat-option value="todo">To Do</mat-option>
                  <mat-option value="in-progress">In Progress</mat-option>
                  <mat-option value="review">Review</mat-option>
                  <mat-option value="completed">Completed</mat-option>
                </mat-select>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="compact-field">
                <mat-select [(value)]="selectedPriority" (selectionChange)="onFilterChange()" placeholder="Priority">
                  <mat-option value="">All Priority</mat-option>
                  <mat-option value="low">Low</mat-option>
                  <mat-option value="medium">Medium</mat-option>
                  <mat-option value="high">High</mat-option>
                  <mat-option value="urgent">Urgent</mat-option>
                </mat-select>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="compact-field">
                <mat-select [(value)]="selectedAssignment" (selectionChange)="onFilterChange()" placeholder="Assignment">
                  <mat-option value="">All Tasks</mat-option>
                  <mat-option value="me">My Tasks</mat-option>
                  <mat-option value="unassigned">Unassigned</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <div class="loading-content">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading your tasks...</p>
        </div>
      </div>

      <!-- Modern Task Grid -->
      <div class="task-grid" *ngIf="!isLoading">
        <div class="task-card modern-card" *ngFor="let task of tasks" (click)="viewTask(task._id)">
          <!-- Card Header -->
          <div class="card-header">
            <div class="project-indicator" [style.background-color]="task.project.color"></div>
            <div class="task-info">
              <h3 class="task-title">{{ task.title }}</h3>
              <span class="project-name">{{ task.project.name }}</span>
            </div>
            <button mat-icon-button (click)="$event.stopPropagation(); editTask(task)">
              <mat-icon>edit</mat-icon>
            </button>
          </div>
          
          <!-- Card Content -->
          <div class="card-content">
            <p class="task-description" *ngIf="task.description">{{ task.description }}</p>
            
            <!-- Status and Priority -->
            <div class="status-row">
              <div class="status-badge" [ngClass]="'status-' + task.status">
                <span class="status-dot"></span>
                {{ getStatusLabel(task.status) }}
              </div>
              <div class="priority-badge" [ngClass]="'priority-' + task.priority">
                <mat-icon class="priority-icon">{{ getPriorityIcon(task.priority) }}</mat-icon>
                {{ task.priority | titlecase }}
              </div>
            </div>
            
            <!-- Assignee and Due Date -->
            <div class="meta-info">
              <div class="assignee" *ngIf="task.assignedTo">
                <div class="avatar" [style.background-color]="getAvatarColor(task.assignedTo.name)">
                  {{ task.assignedTo.name.charAt(0).toUpperCase() }}
                </div>
                <span>{{ task.assignedTo.name }}</span>
              </div>
              
              <div class="due-date" *ngIf="task.dueDate" [ngClass]="{ 'overdue': task.isOverdue }">
                <mat-icon>schedule</mat-icon>
                <span>{{ task.dueDate | date:'MMM d' }}</span>
              </div>
            </div>
            
            <!-- Tags -->
            <div class="task-tags" *ngIf="task.tags?.length">
              <span class="tag" *ngFor="let tag of task.tags">{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="tasks.length === 0">
          <div class="empty-content">
            <div class="empty-icon">
              <mat-icon>task_alt</mat-icon>
            </div>
            <h3>No tasks yet</h3>
            <p>Create your first task to get started with your project</p>
            <button mat-flat-button color="primary" (click)="createTask()">
              <mat-icon>add</mat-icon>
              Create Your First Task
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modern-task-container {
      min-height: 100vh;
      background: #fafbfc;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .page-header {
      background: white;
      border-bottom: 1px solid #e1e5e9;
      padding: 32px 40px 24px;
      margin-bottom: 0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
    }

    .title-section {
      flex: 1;
    }

    .page-title {
      font-size: 32px;
      font-weight: 700;
      color: #1d2129;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }

    .page-subtitle {
      font-size: 16px;
      color: #626f86;
      margin: 0;
      font-weight: 400;
    }

    .create-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
      transition: all 0.2s ease;
      color: white;
    }

    .create-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .filter-bar {
      margin: 0;
    }

    .filter-group {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .compact-field {
      min-width: 140px;
    }

    .compact-field .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
    }

    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
      background: white;
      margin: 24px 40px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .loading-content {
      text-align: center;
    }

    .loading-content p {
      margin-top: 16px;
      color: #626f86;
      font-size: 16px;
    }

    .task-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 24px;
      padding: 24px 40px 40px;
    }

    .modern-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e1e5e9;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
      overflow: visible;
    }

    .modern-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.12);
      border-color: #667eea;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      padding: 20px 20px 16px 20px;
      border-bottom: 1px solid #f0f2f5;
      position: relative;
      min-height: 60px;
      gap: 12px;
    }

    .project-indicator {
      width: 4px;
      height: 40px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .task-info {
      flex: 1;
      min-width: 0;
    }

    .task-title {
      font-size: 16px;
      font-weight: 600;
      color: #1d2129;
      margin: 0 0 4px 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .project-name {
      font-size: 13px;
      color: #626f86;
      font-weight: 500;
    }


    .card-content {
      padding: 16px 20px 20px;
    }

    .task-description {
      font-size: 14px;
      color: #626f86;
      line-height: 1.5;
      margin: 0 0 16px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .status-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .status-badge, .priority-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .priority-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .status-todo { 
      background: #e3f2fd; 
      color: #1565c0; 
    }
    
    .status-in-progress { 
      background: #fff3e0; 
      color: #ef6c00; 
    }
    
    .status-review { 
      background: #fce4ec; 
      color: #c2185b; 
    }
    
    .status-completed { 
      background: #e8f5e8; 
      color: #2e7d32; 
    }

    .priority-low { 
      background: #e8f5e8; 
      color: #388e3c; 
    }
    
    .priority-medium { 
      background: #fff3e0; 
      color: #f57c00; 
    }
    
    .priority-high { 
      background: #ffebee; 
      color: #d32f2f; 
    }
    
    .priority-urgent { 
      background: #fce4ec; 
      color: #ad1457; 
    }

    .meta-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .assignee {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #626f86;
    }

    .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: 600;
    }

    .due-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #626f86;
    }

    .due-date.overdue {
      color: #d32f2f;
    }

    .due-date mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .task-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag {
      background: #f0f2f5;
      color: #626f86;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .empty-state {
      grid-column: 1 / -1;
      background: white;
      border-radius: 12px;
      padding: 60px 40px;
      text-align: center;
      border: 2px dashed #e1e5e9;
    }

    .empty-content {
      max-width: 400px;
      margin: 0 auto;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: white;
    }

    .empty-state h3 {
      font-size: 24px;
      font-weight: 600;
      color: #1d2129;
      margin: 0 0 12px 0;
    }

    .empty-state p {
      font-size: 16px;
      color: #626f86;
      margin: 0 0 32px 0;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .page-header {
        padding: 24px 20px 16px;
      }
      
      .header-content {
        flex-direction: column;
        gap: 20px;
      }
      
      .task-grid {
        grid-template-columns: 1fr;
        padding: 16px 20px 32px;
        gap: 16px;
      }
      
      .filter-group {
        flex-direction: column;
      }
      
      .compact-field {
        min-width: 100%;
      }
    }

    @media (max-width: 480px) {
      .page-title {
        font-size: 24px;
      }
      
      .card-header {
        padding: 16px;
      }
      
      .card-content {
        padding: 12px 16px 16px;
      }
    }
  `]
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  isLoading = true;
  selectedStatus = '';
  selectedPriority = '';
  selectedAssignment = '';
  private destroy$ = new Subject<void>();

  constructor(
    private taskService: TaskService,
    private notificationService: NotificationService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTasks(): void {
    const filters: any = {};
    if (this.selectedStatus) filters.status = this.selectedStatus;
    if (this.selectedPriority) filters.priority = this.selectedPriority;
    if (this.selectedAssignment) filters.assignedTo = this.selectedAssignment;

    this.taskService.getTasks(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tasks = response.tasks;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading tasks:', error);
          this.notificationService.showError('Failed to load tasks');
          this.isLoading = false;
        }
      });
  }

  onFilterChange(): void {
    this.isLoading = true;
    this.loadTasks();
  }

  createTask(): void {
    this.router.navigate(['/tasks/create']);
  }

  viewTask(taskId: string): void {
    this.router.navigate(['/tasks', taskId], {
      state: { referrer: this.router.url }
    });
  }

  editTask(task: Task): void {
    const dialogRef = this.dialog.open(TaskEditDialogComponent, {
      width: '600px',
      data: { task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the task list to show updated data
        this.loadTasks();
      }
    });
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'review': 'Review',
      'completed': 'Completed'
    };
    return statusMap[status] || status;
  }

  getPriorityIcon(priority: string): string {
    const iconMap: { [key: string]: string } = {
      'low': 'keyboard_arrow_down',
      'medium': 'remove',
      'high': 'keyboard_arrow_up',
      'urgent': 'priority_high'
    };
    return iconMap[priority] || 'remove';
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
      '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
