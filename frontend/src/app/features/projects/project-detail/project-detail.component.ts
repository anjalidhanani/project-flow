import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { ProjectService } from '../../../core/services/project.service';
import { TaskService, Task } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { TaskEditDialogComponent } from '../../tasks/task-edit-dialog/task-edit-dialog.component';
import { InviteMemberDialogComponent } from '../invite-member-dialog/invite-member-dialog.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    DragDropModule
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  project: any = null;
  tasks: Task[] = [];
  members: any[] = [];
  isLoading = true;
  private destroy$ = new Subject<void>();

  taskStatuses = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' }
  ];

  currentView: 'kanban' | 'list' = 'kanban';
  selectedTabIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private projectService: ProjectService,
    private taskService: TaskService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    
    // Handle tab query parameter
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'tasks') {
      this.selectedTabIndex = 0; // Tasks tab
    } else if (tabParam === 'team') {
      this.selectedTabIndex = 1; // Team tab
    } else if (tabParam === 'overview') {
      this.selectedTabIndex = 2; // Overview tab
    }
    
    if (projectId) {
      // Check if user is authenticated before loading project
      this.authService.isAuthenticated$
        .pipe(takeUntil(this.destroy$))
        .subscribe(isAuthenticated => {
          if (isAuthenticated) {
            this.loadProject(projectId);
          } else {
            // User is not authenticated, redirect to login
            this.router.navigate(['/login']);
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProject(projectId: string): void {
    this.projectService.getProject(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.project = response.project;
          this.tasks = response.tasks || [];
          this.members = response.members || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading project:', error);
          if (error.status === 401) {
            // Token expired or invalid, redirect to login
            this.authService.logout();
            return;
          }
          this.notificationService.showError('Failed to load project details');
          this.isLoading = false;
        }
      });
  }

  goBack(): void {
    this.location.back();
  }

  editProject(): void {
    if (this.project?._id) {
      this.router.navigate(['/projects', this.project._id, 'edit']);
    }
  }

  inviteMembers(): void {
    if (!this.project?._id) return;

    const dialogRef = this.dialog.open(InviteMemberDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        projectId: this.project._id,
        projectName: this.project.name,
        existingMembers: this.members
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh project data to get updated member list
        this.loadProject(this.project._id);
      }
    });
  }

  createTask(status?: string): void {
    this.router.navigate(['/tasks/create'], {
      queryParams: {
        projectId: this.project?._id,
        status: status || 'todo'
      }
    });
  }

  viewTask(taskId: string): void {
    this.router.navigate(['/tasks', taskId], {
      state: { referrer: this.router.url }
    });
  }

  updateMemberRole(member: any, newRole: string): void {
    if (!this.project?._id || !member._id) return;

    this.projectService.updateMemberRole(this.project._id, member._id, newRole)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Member role updated successfully');
          this.loadProject(this.project._id);
        },
        error: (error) => {
          console.error('Error updating member role:', error);
          this.notificationService.showError('Failed to update member role');
        }
      });
  }

  removeMember(member: any): void {
    if (!this.project?._id || !member._id) return;

    if (confirm(`Are you sure you want to remove ${member.user?.name || member.name} from this project?`)) {
      this.projectService.removeMember(this.project._id, member._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Member removed successfully');
            this.loadProject(this.project._id);
          },
          error: (error) => {
            console.error('Error removing member:', error);
            this.notificationService.showError('Failed to remove member');
          }
        });
    }
  }

  editTask(task: Task): void {
    const dialogRef = this.dialog.open(TaskEditDialogComponent, {
      width: '600px',
      data: { task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the project data to show updated tasks
        const projectId = this.route.snapshot.paramMap.get('id');
        if (projectId) {
          this.loadProject(projectId);
        }
      }
    });
  }

  getTasksByStatus(status: string): Task[] {
    return this.tasks.filter(task => task.status === status);
  }

  getProgressPercentage(): number {
    if (this.tasks.length === 0) return 0;
    const completedTasks = this.getTasksByStatus('completed').length;
    return Math.round((completedTasks / this.tasks.length) * 100);
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'urgent': return 'priority_high';
      case 'high': return 'keyboard_arrow_up';
      case 'medium': return 'remove';
      case 'low': return 'keyboard_arrow_down';
      default: return 'remove';
    }
  }

  getStatusLabel(status: string): string {
    const statusItem = this.taskStatuses.find(s => s.value === status);
    return statusItem ? statusItem.label : status;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'planning': return 'schedule';
      case 'active': return 'play_circle';
      case 'on-hold': return 'pause_circle';
      case 'completed': return 'check_circle';
      default: return 'radio_button_unchecked';
    }
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
      '#f97316', '#6366f1', '#14b8a6', '#f43f5e'
    ];
    
    if (!name) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  isOverdue(dueDate: string | Date): boolean {
    if (!dueDate) return false;
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return due < new Date();
  }

  trackByStatus(index: number, status: any): string {
    return status.value;
  }

  trackByTask(index: number, task: Task): string {
    return task._id;
  }

  setView(view: 'kanban' | 'list'): void {
    this.currentView = view;
  }

  canDeleteProject(): boolean {
    return this.project?.memberRole === 'owner' || this.project?.memberRole === 'admin';
  }

  canEditProject(): boolean {
    return this.project?.memberRole === 'owner' || 
           this.project?.memberRole === 'admin' || 
           this.project?.memberRole === 'manager';
  }

  canManageMembers(): boolean {
    return this.project?.memberRole === 'owner' || this.project?.memberRole === 'admin';
  }

  isOwner(): boolean {
    return this.project?.memberRole === 'owner';
  }

  canModifyMember(member: any): boolean {
    // Users cannot modify their own roles
    if (this.isCurrentUser(member)) {
      return false;
    }
    // Only owners can modify other owners
    if (member.role === 'owner') {
      return this.isOwner();
    }
    // Owners and admins can modify non-owners
    return this.canManageMembers();
  }

  isCurrentUser(member: any): boolean {
    // Check if this member is the current logged-in user
    const currentUser = this.authService.getCurrentUser();
    return member.user?._id === currentUser?.id || member.user?.id === currentUser?.id;
  }

  deleteProject(): void {
    if (!this.project?._id) return;

    const confirmMessage = `Are you sure you want to delete "${this.project.name}"? This action cannot be undone and will remove all tasks, members, and project data.`;
    
    if (confirm(confirmMessage)) {
      this.projectService.deleteProject(this.project._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Project deleted successfully');
            this.router.navigate(['/projects']);
          },
          error: (error) => {
            console.error('Error deleting project:', error);
            this.notificationService.showError(error.error?.message || 'Failed to delete project');
          }
        });
    }
  }

  onTaskDrop(event: CdkDragDrop<Task[]>, newStatus: string): void {
    const task = event.item.data as Task;
    const previousStatus = task.status;

    if (event.previousContainer === event.container) {
      // Same column - just reorder position
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      
      // Update position in backend
      this.taskService.updateTaskPosition(task._id, event.currentIndex)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Position updated successfully
          },
          error: (error) => {
            console.error('Error updating task position:', error);
            // Revert the move on error
            moveItemInArray(event.container.data, event.currentIndex, event.previousIndex);
            this.notificationService.showError('Failed to update task position');
          }
        });
    } else {
      // Different column - update status and position
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update task status and position in backend
      this.taskService.updateTaskPosition(task._id, event.currentIndex, newStatus)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Update local task object with new status
            task.status = newStatus as 'todo' | 'in-progress' | 'review' | 'completed';
            this.notificationService.showSuccess(`Task moved to ${this.getStatusLabel(newStatus)}`);
          },
          error: (error) => {
            console.error('Error updating task status:', error);
            // Revert the move on error
            transferArrayItem(
              event.container.data,
              event.previousContainer.data,
              event.currentIndex,
              event.previousIndex
            );
            task.status = previousStatus;
            this.notificationService.showError('Failed to move task');
          }
        });
    }
  }

  getTaskListId(status: string): string {
    return `task-list-${status}`;
  }

  getConnectedLists(): string[] {
    return this.taskStatuses.map(status => this.getTaskListId(status.value));
  }
}
