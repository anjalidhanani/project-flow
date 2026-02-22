import { Component, OnInit } from '@angular/core';
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
import { ProjectService } from '../../../core/services/project.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-project-edit',
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
    MatNativeDateModule
  ],
  template: `
    <div class="edit-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Edit Project</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="projectForm" (ngSubmit)="onSubmit()" *ngIf="!isLoading">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Project Name</mat-label>
              <input matInput formControlName="name" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="3" required></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="planning">Planning</mat-option>
                <mat-option value="active">Active</mat-option>
                <mat-option value="on-hold">On Hold</mat-option>
                <mat-option value="completed">Completed</mat-option>
                <mat-option value="cancelled">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Priority</mat-label>
              <mat-select formControlName="priority">
                <mat-option value="low">Low</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="high">High</mat-option>
                <mat-option value="urgent">Urgent</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="actions">
              <button mat-button type="button" (click)="cancel()">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="projectForm.invalid || isSaving">
                Save Changes
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .edit-container {
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
    }
  `]
})
export class ProjectEditComponent implements OnInit {
  projectForm: FormGroup;
  projectId: string = '';
  isLoading = true;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private notificationService: NotificationService
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      status: [''],
      priority: ['']
    });
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.loadProject();
  }

  private loadProject(): void {
    this.projectService.getProject(this.projectId).subscribe({
      next: (response) => {
        this.projectForm.patchValue(response.project);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading project:', error);
        this.notificationService.showError('Failed to load project');
        this.router.navigate(['/projects']);
      }
    });
  }

  onSubmit(): void {
    if (this.projectForm.valid) {
      this.isSaving = true;
      
      this.projectService.updateProject(this.projectId, this.projectForm.value).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Project updated successfully!');
          this.router.navigate(['/projects', this.projectId]);
        },
        error: (error) => {
          this.isSaving = false;
          this.notificationService.showError(error.error?.message || 'Failed to update project');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/projects', this.projectId]);
  }
}
