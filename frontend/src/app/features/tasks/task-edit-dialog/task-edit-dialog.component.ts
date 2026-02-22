import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { TaskService, Task } from '../../../core/services/task.service';
import { ProjectService } from '../../../core/services/project.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-task-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Edit Task</h2>
    
    <mat-dialog-content>
      <form [formGroup]="taskForm" class="task-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" placeholder="Enter task title">
          <mat-error *ngIf="taskForm.get('title')?.hasError('required')">
            Title is required
          </mat-error>
          <mat-error *ngIf="taskForm.get('title')?.hasError('maxlength')">
            Title cannot exceed 100 characters
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Enter task description"></textarea>
          <mat-error *ngIf="taskForm.get('description')?.hasError('maxlength')">
            Description cannot exceed 1000 characters
          </mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="todo">To Do</mat-option>
              <mat-option value="in-progress">In Progress</mat-option>
              <mat-option value="review">Review</mat-option>
              <mat-option value="completed">Completed</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Priority</mat-label>
            <mat-select formControlName="priority">
              <mat-option value="low">Low</mat-option>
              <mat-option value="medium">Medium</mat-option>
              <mat-option value="high">High</mat-option>
              <mat-option value="urgent">Urgent</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Assigned To</mat-label>
            <mat-select formControlName="assignedTo">
              <mat-option value="">Unassigned</mat-option>
              <mat-option *ngFor="let member of projectMembers" [value]="member.user._id">
                {{ member.user.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Due Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dueDate">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Estimated Hours</mat-label>
          <input matInput type="number" formControlName="estimatedHours" min="0" step="0.5">
        </mat-form-field>

        <div class="tags-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Tags (comma separated)</mat-label>
            <input matInput formControlName="tagsInput" placeholder="Enter tags separated by commas">
          </mat-form-field>
          
          <div class="current-tags" *ngIf="currentTags.length > 0">
            <mat-chip-listbox>
              <mat-chip *ngFor="let tag of currentTags" (removed)="removeTag(tag)">
                {{ tag }}
                <mat-icon matChipRemove>cancel</mat-icon>
              </mat-chip>
            </mat-chip-listbox>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="taskForm.invalid || isLoading">
        {{ isLoading ? 'Saving...' : 'Save Changes' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .task-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 500px;
      max-width: 600px;
    }

    .full-width {
      width: 100%;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .tags-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .current-tags {
      margin-top: 8px;
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class TaskEditDialogComponent implements OnInit, OnDestroy {
  taskForm: FormGroup;
  projectMembers: any[] = [];
  currentTags: string[] = [];
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TaskEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { task: Task },
    private taskService: TaskService,
    private projectService: ProjectService,
    private notificationService: NotificationService
  ) {
    this.taskForm = this.createForm();
  }

  ngOnInit(): void {
    console.log('TaskEditDialog - Task data received:', this.data.task);
    console.log('TaskEditDialog - Project data:', this.data.task.project);
    this.loadProjectMembers();
    this.populateForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(1000)]],
      status: ['todo'],
      priority: ['medium'],
      assignedTo: [''],
      dueDate: [''],
      estimatedHours: [0, [Validators.min(0)]],
      tagsInput: ['']
    });
  }

  private populateForm(): void {
    const task = this.data.task;
    this.taskForm.patchValue({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo?._id || '',
      dueDate: task.dueDate ? new Date(task.dueDate) : '',
      estimatedHours: task.estimatedHours || 0,
      tagsInput: task.tags.join(', ')
    });
    
    this.currentTags = [...task.tags];
  }

  private loadProjectMembers(): void {
    // Get project ID from task data - handle different possible structures
    const project = this.data.task.project;
    let projectId: string | undefined;
    
    if (typeof project === 'string') {
      projectId = project;
    } else if (project && typeof project === 'object') {
      projectId = (project as any)._id || (project as any).id;
    }
    
    if (!projectId) {
      console.error('No project ID found in task data:', this.data.task);
      return;
    }

    this.projectService.getProjectMembers(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.projectMembers = response.members;
        },
        error: (error) => {
          console.error('Error loading project members:', error);
          console.error('Project ID used:', projectId);
        }
      });
  }

  removeTag(tag: string): void {
    this.currentTags = this.currentTags.filter(t => t !== tag);
    this.updateTagsInput();
  }

  private updateTagsInput(): void {
    this.taskForm.patchValue({
      tagsInput: this.currentTags.join(', ')
    });
  }

  onSave(): void {
    if (this.taskForm.valid) {
      this.isLoading = true;
      
      // Parse tags from input
      const tagsInput = this.taskForm.get('tagsInput')?.value || '';
      const tags = tagsInput
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);

      const formValue = this.taskForm.value;
      const updates = {
        title: formValue.title,
        description: formValue.description,
        status: formValue.status,
        priority: formValue.priority,
        assignedTo: formValue.assignedTo || undefined,
        dueDate: formValue.dueDate || undefined,
        estimatedHours: formValue.estimatedHours,
        tags
      };

      this.taskService.updateTask(this.data.task._id, updates)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Task updated successfully');
            this.dialogRef.close(response.task);
          },
          error: (error) => {
            console.error('Error updating task:', error);
            this.notificationService.showError('Failed to update task');
            this.isLoading = false;
          }
        });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
