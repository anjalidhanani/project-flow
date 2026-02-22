import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectService } from '../../../core/services/project.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-project-create',
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
  templateUrl: './project-create.component.html',
  styleUrls: ['./project-create.component.scss']
})
export class ProjectCreateComponent {
  projectForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      priority: ['medium'],
      color: ['#667eea']
    });
  }

  onSubmit(): void {
    if (this.projectForm.valid) {
      this.isLoading = true;
      
      this.projectService.createProject(this.projectForm.value).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Project created successfully!');
          this.router.navigate(['/projects', response.project._id]);
        },
        error: (error) => {
          this.isLoading = false;
          this.notificationService.showError(error.error?.message || 'Failed to create project');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/projects']);
  }
}
