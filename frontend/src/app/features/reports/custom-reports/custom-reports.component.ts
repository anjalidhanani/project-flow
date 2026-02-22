import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportService, CustomReportFilter } from '../services/report.service';
import { ProjectService } from '../../../core/services/project.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-custom-reports',
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
    MatCheckboxModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="custom-reports">
      <div class="header">
        <div class="header-top">
          <div class="header-left">
            <button mat-icon-button (click)="goBack()" class="back-button">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1>Custom Reports</h1>
          </div>
        </div>
        <p>Create tailored reports with specific filters and criteria</p>
      </div>

      <mat-card class="report-builder">
        <mat-card-header>
          <mat-card-title>Report Builder</mat-card-title>
          <mat-card-subtitle>Configure your custom report parameters</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <mat-stepper [linear]="true" #stepper>
            <!-- Step 1: Date Range -->
            <mat-step [stepControl]="dateRangeForm" label="Date Range">
              <form [formGroup]="dateRangeForm">
                <div class="step-content">
                  <h3>Select Date Range</h3>
                  <div class="date-fields">
                    <mat-form-field>
                      <mat-label>Start Date</mat-label>
                      <input matInput [matDatepicker]="startPicker" formControlName="startDate" required>
                      <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                      <mat-datepicker #startPicker></mat-datepicker>
                      <mat-error *ngIf="dateRangeForm.get('startDate')?.hasError('required')">
                        Start date is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>End Date</mat-label>
                      <input matInput [matDatepicker]="endPicker" formControlName="endDate" required>
                      <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                      <mat-datepicker #endPicker></mat-datepicker>
                      <mat-error *ngIf="dateRangeForm.get('endDate')?.hasError('required')">
                        End date is required
                      </mat-error>
                    </mat-form-field>
                  </div>
                  
                  <div class="quick-ranges">
                    <h4>Quick Ranges</h4>
                    <div class="range-buttons">
                      <button mat-button type="button" (click)="setQuickRange('week')">Last 7 Days</button>
                      <button mat-button type="button" (click)="setQuickRange('month')">Last 30 Days</button>
                      <button mat-button type="button" (click)="setQuickRange('quarter')">Last 3 Months</button>
                      <button mat-button type="button" (click)="setQuickRange('year')">Last Year</button>
                    </div>
                  </div>
                </div>
                
                <div class="step-actions">
                  <button mat-raised-button color="primary" matStepperNext 
                          [disabled]="!dateRangeForm.valid">Next</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 2: Project Selection -->
            <mat-step [stepControl]="projectForm" label="Projects">
              <form [formGroup]="projectForm">
                <div class="step-content">
                  <h3>Select Projects</h3>
                  <mat-form-field>
                    <mat-label>Projects</mat-label>
                    <mat-select multiple formControlName="projectIds">
                      <mat-option>
                        <mat-checkbox (change)="toggleAllProjects($event)" 
                                    [checked]="allProjectsSelected()"
                                    [indeterminate]="someProjectsSelected()">
                          Select All
                        </mat-checkbox>
                      </mat-option>
                      <mat-option *ngFor="let project of availableProjects" [value]="project.id">
                        {{ project.name }}
                      </mat-option>
                    </mat-select>
                    <mat-hint>Leave empty to include all projects</mat-hint>
                  </mat-form-field>
                </div>
                
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext>Next</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 3: User Selection -->
            <mat-step [stepControl]="userForm" label="Users">
              <form [formGroup]="userForm">
                <div class="step-content">
                  <h3>Select Users</h3>
                  <mat-form-field>
                    <mat-label>Users</mat-label>
                    <mat-select multiple formControlName="userIds">
                      <mat-option>
                        <mat-checkbox (change)="toggleAllUsers($event)" 
                                    [checked]="allUsersSelected()"
                                    [indeterminate]="someUsersSelected()">
                          Select All
                        </mat-checkbox>
                      </mat-option>
                      <mat-option *ngFor="let user of availableUsers" [value]="user.id">
                        {{ user.name }}
                      </mat-option>
                    </mat-select>
                    <mat-hint>Leave empty to include all users</mat-hint>
                  </mat-form-field>
                </div>
                
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext>Next</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 4: Filters -->
            <mat-step [stepControl]="filtersForm" label="Filters">
              <form [formGroup]="filtersForm">
                <div class="step-content">
                  <h3>Additional Filters</h3>
                  
                  <div class="filter-section">
                    <h4>Task Status</h4>
                    <div class="checkbox-group">
                      <mat-checkbox formControlName="includePending">Pending</mat-checkbox>
                      <mat-checkbox formControlName="includeInProgress">In Progress</mat-checkbox>
                      <mat-checkbox formControlName="includeCompleted">Completed</mat-checkbox>
                      <mat-checkbox formControlName="includeOverdue">Overdue</mat-checkbox>
                    </div>
                  </div>

                  <div class="filter-section">
                    <h4>Task Priority</h4>
                    <div class="checkbox-group">
                      <mat-checkbox formControlName="includeHighPriority">High Priority</mat-checkbox>
                      <mat-checkbox formControlName="includeMediumPriority">Medium Priority</mat-checkbox>
                      <mat-checkbox formControlName="includeLowPriority">Low Priority</mat-checkbox>
                    </div>
                  </div>
                </div>
                
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext>Next</button>
                </div>
              </form>
            </mat-step>

            <!-- Step 5: Generate Report -->
            <mat-step label="Generate">
              <div class="step-content">
                <h3>Generate Report</h3>
                <p>Review your selections and generate the custom report.</p>
                
                <div class="report-summary">
                  <h4>Report Summary</h4>
                  <div class="summary-item">
                    <strong>Date Range:</strong> 
                    {{ dateRangeForm.get('startDate')?.value | date:'mediumDate' }} - 
                    {{ dateRangeForm.get('endDate')?.value | date:'mediumDate' }}
                  </div>
                  <div class="summary-item">
                    <strong>Projects:</strong> 
                    {{ getSelectedProjectsText() }}
                  </div>
                  <div class="summary-item">
                    <strong>Users:</strong> 
                    {{ getSelectedUsersText() }}
                  </div>
                  <div class="summary-item">
                    <strong>Filters:</strong> 
                    {{ getSelectedFiltersText() }}
                  </div>
                </div>

                <div class="generate-actions">
                  <button mat-raised-button color="primary" 
                          (click)="generateReport()" 
                          [disabled]="generating">
                    <mat-spinner diameter="20" *ngIf="generating"></mat-spinner>
                    <mat-icon *ngIf="!generating">assessment</mat-icon>
                    {{ generating ? 'Generating...' : 'Generate Report' }}
                  </button>
                  
                  <div class="export-options" *ngIf="reportGenerated && !generating">
                    <button mat-raised-button color="accent" (click)="exportReport('pdf')">
                      <mat-icon>picture_as_pdf</mat-icon>
                      Export PDF
                    </button>
                    <button mat-raised-button color="accent" (click)="exportReport('csv')">
                      <mat-icon>table_chart</mat-icon>
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="step-actions">
                <button mat-button matStepperPrevious>Back</button>
                <button mat-button (click)="resetForm()">Start Over</button>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>

      <!-- Report Results -->
      <div class="report-results" *ngIf="reportData && !generating">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Report Results</mat-card-title>
            <mat-card-subtitle>Generated on {{ currentDate | date:'medium' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="results-content">
              <!-- Display report data here -->
              <pre>{{ reportData | json }}</pre>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .custom-reports {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;
    }

    .header-top {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
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

    .header p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .report-builder {
      margin-bottom: 32px;
    }

    .step-content {
      padding: 24px 0;
    }

    .step-content h3 {
      margin: 0 0 24px 0;
      color: #333;
    }

    .step-content h4 {
      margin: 16px 0 12px 0;
      color: #555;
    }

    .date-fields {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
    }

    .date-fields mat-form-field {
      flex: 1;
    }

    .quick-ranges {
      margin-top: 16px;
    }

    .range-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-section {
      margin-bottom: 24px;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-left: 16px;
    }

    .step-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .report-summary {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .report-summary h4 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .summary-item {
      margin-bottom: 8px;
      color: #666;
    }

    .summary-item strong {
      color: #333;
    }

    .generate-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }

    .generate-actions button {
      min-width: 200px;
    }

    .export-options {
      display: flex;
      gap: 12px;
    }

    .report-results {
      margin-top: 32px;
    }

    .results-content {
      max-height: 400px;
      overflow-y: auto;
    }

    .results-content pre {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      font-size: 12px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    @media (max-width: 768px) {
      .date-fields {
        flex-direction: column;
      }

      .range-buttons {
        justify-content: center;
      }

      .step-actions {
        justify-content: space-between;
      }

      .export-options {
        flex-direction: column;
        width: 100%;
      }

      .export-options button {
        width: 100%;
      }
    }
  `]
})
export class CustomReportsComponent implements OnInit {
  dateRangeForm!: FormGroup;
  projectForm!: FormGroup;
  userForm!: FormGroup;
  filtersForm!: FormGroup;

  availableProjects: any[] = [];
  availableUsers: any[] = [];
  
  generating = false;
  reportGenerated = false;
  reportData: any = null;
  currentDate = new Date();

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private snackBar: MatSnackBar,
    private projectService: ProjectService,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadAvailableOptions();
  }

  private initializeForms() {
    this.dateRangeForm = this.fb.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required]
    });

    this.projectForm = this.fb.group({
      projectIds: [[]]
    });

    this.userForm = this.fb.group({
      userIds: [[]]
    });

    this.filtersForm = this.fb.group({
      includePending: [true],
      includeInProgress: [true],
      includeCompleted: [true],
      includeOverdue: [true],
      includeHighPriority: [true],
      includeMediumPriority: [true],
      includeLowPriority: [true]
    });
  }

  private loadAvailableOptions() {
    // Load available projects and users from the service
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.availableProjects = response.projects.map(project => ({
          id: project._id,
          name: project.name
        }));

        // Extract unique users from project members
        const uniqueUsers = new Map();
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
        console.error('Error loading projects and users:', error);
        // Fallback to empty arrays
        this.availableProjects = [];
        this.availableUsers = [];
      }
    });
  }

  setQuickRange(range: string) {
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    this.dateRangeForm.patchValue({
      startDate: startDate,
      endDate: endDate
    });
  }

  toggleAllProjects(event: any) {
    if (event.checked) {
      this.projectForm.patchValue({
        projectIds: this.availableProjects.map(p => p.id)
      });
    } else {
      this.projectForm.patchValue({
        projectIds: []
      });
    }
  }

  toggleAllUsers(event: any) {
    if (event.checked) {
      this.userForm.patchValue({
        userIds: this.availableUsers.map(u => u.id)
      });
    } else {
      this.userForm.patchValue({
        userIds: []
      });
    }
  }

  allProjectsSelected(): boolean {
    const selected = this.projectForm.get('projectIds')?.value || [];
    return selected.length === this.availableProjects.length;
  }

  someProjectsSelected(): boolean {
    const selected = this.projectForm.get('projectIds')?.value || [];
    return selected.length > 0 && selected.length < this.availableProjects.length;
  }

  allUsersSelected(): boolean {
    const selected = this.userForm.get('userIds')?.value || [];
    return selected.length === this.availableUsers.length;
  }

  someUsersSelected(): boolean {
    const selected = this.userForm.get('userIds')?.value || [];
    return selected.length > 0 && selected.length < this.availableUsers.length;
  }

  getSelectedProjectsText(): string {
    const selected = this.projectForm.get('projectIds')?.value || [];
    if (selected.length === 0) return 'All projects';
    if (selected.length === this.availableProjects.length) return 'All projects';
    return `${selected.length} selected`;
  }

  getSelectedUsersText(): string {
    const selected = this.userForm.get('userIds')?.value || [];
    if (selected.length === 0) return 'All users';
    if (selected.length === this.availableUsers.length) return 'All users';
    return `${selected.length} selected`;
  }

  getSelectedFiltersText(): string {
    const filters = this.filtersForm.value;
    const activeFilters: string[] = [];

    // Task status filters
    const statusFilters = [];
    if (filters.includePending) statusFilters.push('Pending');
    if (filters.includeInProgress) statusFilters.push('In Progress');
    if (filters.includeCompleted) statusFilters.push('Completed');
    if (filters.includeOverdue) statusFilters.push('Overdue');
    
    if (statusFilters.length > 0) {
      activeFilters.push(`Status: ${statusFilters.join(', ')}`);
    }

    // Priority filters
    const priorityFilters = [];
    if (filters.includeHighPriority) priorityFilters.push('High');
    if (filters.includeMediumPriority) priorityFilters.push('Medium');
    if (filters.includeLowPriority) priorityFilters.push('Low');
    
    if (priorityFilters.length > 0) {
      activeFilters.push(`Priority: ${priorityFilters.join(', ')}`);
    }

    return activeFilters.length > 0 ? activeFilters.join('; ') : 'No filters applied';
  }

  generateReport() {
    this.generating = true;
    this.reportGenerated = false;
    this.reportData = null;
    this.currentDate = new Date(); // Update timestamp when generating report

    const filters = this.buildCustomFilters();

    this.reportService.generateCustomReport(filters).subscribe({
      next: (data) => {
        this.reportData = data;
        this.reportGenerated = true;
        this.generating = false;
        this.snackBar.open('Report generated successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error generating report:', error);
        this.generating = false;
        this.snackBar.open('Error generating report. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  exportReport(format: 'pdf' | 'csv') {
    const filters = this.buildCustomFilters();
    
    this.reportService.exportReport('custom', format, filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `custom-report.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.snackBar.open(`Report exported as ${format.toUpperCase()}!`, 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error exporting report:', error);
        this.snackBar.open('Error exporting report. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  resetForm() {
    this.initializeForms();
    this.reportGenerated = false;
    this.reportData = null;
  }

  private buildCustomFilters(): CustomReportFilter {
    const dateRange = this.dateRangeForm.value;
    const projects = this.projectForm.value.projectIds;
    const users = this.userForm.value.userIds;
    const filters = this.filtersForm.value;

    const taskStatuses: string[] = [];
    if (filters.includePending) taskStatuses.push('pending');
    if (filters.includeInProgress) taskStatuses.push('in_progress');
    if (filters.includeCompleted) taskStatuses.push('completed');
    if (filters.includeOverdue) taskStatuses.push('overdue');

    const priorities: string[] = [];
    if (filters.includeHighPriority) priorities.push('high');
    if (filters.includeMediumPriority) priorities.push('medium');
    if (filters.includeLowPriority) priorities.push('low');

    return {
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      },
      projectIds: projects.length > 0 ? projects : undefined,
      userIds: users.length > 0 ? users : undefined,
      taskStatuses: taskStatuses.length > 0 ? taskStatuses : undefined,
      priorities: priorities.length > 0 ? priorities : undefined
    };
  }

  goBack() {
    this.router.navigate(['/reports']);
  }
}
