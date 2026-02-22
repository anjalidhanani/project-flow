import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TaskService } from '../../../core/services/task.service';
import { ProjectService, Project } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './task-create.component.html',
  styleUrls: ['./task-create.component.scss']
})
export class TaskCreateComponent implements OnInit, OnDestroy {
  taskForm: FormGroup;
  projects: Project[] = [];
  teamMembers: any[] = [];
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private projectService: ProjectService,
    private userService: UserService,
    private notificationService: NotificationService
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      project: ['', Validators.required],
      priority: ['medium'],
      status: ['todo'],
      dueDate: [''],
      estimatedHours: [0],
      assignedTo: [''],
      tags: [[]]
    });
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadTeamMembers();
    
    // Pre-select project if provided in query params
    const projectId = this.route.snapshot.queryParamMap.get('project');
    if (projectId) {
      this.taskForm.patchValue({ project: projectId });
    }
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
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.notificationService.showError('Failed to load projects');
        }
      });
  }

  private loadTeamMembers(): void {
    // Initialize empty team members array
    // Team member assignment will be available when UserService.getUsers is implemented
    this.teamMembers = [];
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

  onSubmit(): void {
    if (this.taskForm.valid) {
      this.isLoading = true;
      
      this.taskService.createTask(this.taskForm.value).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Task created successfully!');
          this.router.navigate(['/tasks', response.task._id]);
        },
        error: (error) => {
          this.isLoading = false;
          this.notificationService.showError(error.error?.message || 'Failed to create task');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/tasks']);
  }
}
