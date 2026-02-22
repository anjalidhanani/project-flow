import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { CalendarService, CalendarEvent, CreateEventRequest } from '../../../core/services/calendar.service';
import { ProjectService, Project } from '../../../core/services/project.service';
import { Observable } from 'rxjs';

export interface EventDialogData {
  event?: CalendarEvent;
  date?: Date;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatIconModule
  ],
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss']
})
export class EventDialogComponent implements OnInit {
  eventForm: FormGroup;
  projects$: Observable<{ projects: Project[] }>;
  isLoading = false;
  
  predefinedColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Gray', value: '#6b7280' }
  ];

  constructor(
    private fb: FormBuilder,
    private calendarService: CalendarService,
    private projectService: ProjectService,
    private dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EventDialogData
  ) {
    this.eventForm = this.createForm();
    this.projects$ = this.projectService.getProjects();
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.event) {
      this.populateForm(this.data.event);
    } else if (this.data.date) {
      this.setDefaultDate(this.data.date);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      startDate: [new Date(), Validators.required],
      startTime: ['09:00', Validators.required],
      endDate: [new Date(), Validators.required],
      endTime: ['10:00', Validators.required],
      allDay: [false],
      project: [''],
      location: ['', [Validators.maxLength(200)]],
      color: ['#3b82f6'],
      isPrivate: [false]
    });
  }

  private populateForm(event: CalendarEvent): void {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    this.eventForm.patchValue({
      title: event.title,
      description: event.description || '',
      startDate: startDate,
      startTime: this.formatTimeForInput(startDate),
      endDate: endDate,
      endTime: this.formatTimeForInput(endDate),
      allDay: event.allDay,
      project: event.project?._id || '',
      location: event.location || '',
      color: event.color || '#3b82f6',
      isPrivate: Boolean(event.isPrivate)
    });

    // Force update the isPrivate control specifically
    this.eventForm.get('isPrivate')?.setValue(Boolean(event.isPrivate));
    this.eventForm.get('isPrivate')?.updateValueAndValidity();
  }

  private setDefaultDate(date: Date): void {
    const startTime = new Date(date);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(10, 0, 0, 0);

    this.eventForm.patchValue({
      startDate: date,
      endDate: date,
      startTime: this.formatTimeForInput(startTime),
      endTime: this.formatTimeForInput(endTime)
    });
  }

  private formatTimeForInput(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  onAllDayChange(): void {
    const allDay = this.eventForm.get('allDay')?.value;
    const startTimeControl = this.eventForm.get('startTime');
    const endTimeControl = this.eventForm.get('endTime');

    if (allDay) {
      startTimeControl?.disable();
      endTimeControl?.disable();
    } else {
      startTimeControl?.enable();
      endTimeControl?.enable();
    }
  }

  onSubmit(): void {
    if (this.eventForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      const formValue = this.eventForm.value;
      const eventData = this.buildEventData(formValue);

      if (this.data.mode === 'create') {
        this.createEvent(eventData);
      } else {
        this.updateEvent(eventData);
      }
    }
  }

  private buildEventData(formValue: any): CreateEventRequest {
    let startDate: Date;
    let endDate: Date;

    if (formValue.allDay) {
      startDate = new Date(formValue.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(formValue.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const [startHour, startMinute] = formValue.startTime.split(':').map(Number);
      const [endHour, endMinute] = formValue.endTime.split(':').map(Number);
      
      startDate = new Date(formValue.startDate);
      startDate.setHours(startHour, startMinute, 0, 0);
      
      endDate = new Date(formValue.endDate);
      endDate.setHours(endHour, endMinute, 0, 0);
    }

    return {
      title: formValue.title,
      description: formValue.description || undefined,
      startDate,
      endDate,
      allDay: formValue.allDay,
      project: formValue.project || undefined,
      location: formValue.location || undefined,
      color: formValue.color,
      isRecurring: false,
      recurrenceRule: undefined,
      isPrivate: formValue.isPrivate
    };
  }

  private createEvent(eventData: CreateEventRequest): void {
    this.calendarService.createEvent(eventData).subscribe({
      next: (response) => {
        this.calendarService.loadEventsForCurrentView();
        this.dialogRef.close(response.event);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error creating event:', error);
        this.isLoading = false;
      }
    });
  }

  private updateEvent(eventData: CreateEventRequest): void {
    if (this.data.event) {
      this.calendarService.updateEvent(this.data.event._id, eventData).subscribe({
        next: (response) => {
          this.calendarService.loadEventsForCurrentView();
          this.dialogRef.close(response.event);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating event:', error);
          this.isLoading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onDelete(): void {
    if (this.data.event && confirm('Are you sure you want to delete this event?')) {
      this.isLoading = true;
      
      this.calendarService.deleteEvent(this.data.event._id).subscribe({
        next: (response) => {
          this.calendarService.loadEventsForCurrentView();
          this.dialogRef.close({ deleted: true });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error deleting event:', error);
          this.isLoading = false;
          alert('Failed to delete event. Please try again.');
        }
      });
    }
  }

  getDialogTitle(): string {
    return this.data.mode === 'create' ? 'Create Event' : 'Edit Event';
  }

  getSubmitButtonText(): string {
    return this.data.mode === 'create' ? 'Create Event' : 'Update Event';
  }
}
