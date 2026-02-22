import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { ProjectService, Project } from '../../../core/services/project.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  isLoading = true;
  viewMode: 'grid' | 'list' = 'grid';
  searchTerm = '';
  selectedStatus = '';
  private destroy$ = new Subject<void>();

  constructor(
    private projectService: ProjectService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProjects(): void {
    this.projectService.getProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.projects = response.projects;
          this.filteredProjects = [...this.projects];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.notificationService.showError('Failed to load projects');
          this.isLoading = false;
        }
      });
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredProjects = this.projects.filter(project => {
      const matchesSearch = !this.searchTerm || 
        project.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.selectedStatus || project.status === this.selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.filteredProjects = [...this.projects];
  }

  trackByProject(index: number, project: Project): string {
    return project._id;
  }

  createProject(): void {
    this.router.navigate(['/projects/create']);
  }

  viewProject(projectId: string): void {
    this.router.navigate(['/projects', projectId]);
  }

  editProject(projectId: string): void {
    this.router.navigate(['/projects', projectId, 'edit']);
  }

  duplicateProject(projectId: string): void {
    // TODO: Implement project duplication
    this.notificationService.showInfo('Project duplication feature coming soon!');
  }

  archiveProject(projectId: string): void {
    // TODO: Implement project archiving
    this.notificationService.showInfo('Project archiving feature coming soon!');
  }

  deleteProject(projectId: string): void {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      this.projectService.deleteProject(projectId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Project deleted successfully');
            this.loadProjects();
          },
          error: (error) => {
            console.error('Error deleting project:', error);
            this.notificationService.showError('Failed to delete project');
          }
        });
    }
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'planning': 'Planning',
      'active': 'Active',
      'on-hold': 'On Hold',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
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
      '#667eea', '#764ba2', '#f093fb', '#f5576c', 
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    
    if (!name) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  getRandomColor(): string {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c', 
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  isOverdue(dueDate: string | Date): boolean {
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return date < new Date();
  }

  canDeleteProject(project: Project): boolean {
    return project.memberRole === 'owner' || project.memberRole === 'admin';
  }

  canEditProject(project: Project): boolean {
    return project.memberRole === 'owner' || project.memberRole === 'admin' || project.memberRole === 'manager';
  }

  canManageMembers(project: Project): boolean {
    return project.memberRole === 'owner' || project.memberRole === 'admin';
  }
}
