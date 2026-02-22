import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { CalendarService, CalendarView, CalendarDay, CalendarEvent } from '../../core/services/calendar.service';
import { TaskService, Task } from '../../core/services/task.service';
import { EventDialogComponent, EventDialogData } from './event-dialog/event-dialog.component';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatBadgeModule
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentView: CalendarView | null = null;
  currentDate = new Date();
  selectedDate: Date | null = null;
  events: CalendarEvent[] = [];
  tasks: Task[] = [];
  
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private calendarService: CalendarService,
    private taskService: TaskService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeCalendar();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeCalendar(): void {
    // Subscribe to current view changes
    this.calendarService.currentView$
      .pipe(takeUntil(this.destroy$))
      .subscribe(date => {
        this.currentDate = date;
        this.generateCalendarView();
      });

    // Subscribe to events and tasks
    combineLatest([
      this.calendarService.events$,
      this.taskService.getTasks()
    ]).pipe(
      takeUntil(this.destroy$),
      map(([events, tasksResponse]) => ({
        events,
        tasks: tasksResponse.tasks
      }))
    ).subscribe(({ events, tasks }) => {
      this.events = events;
      this.tasks = tasks;
      this.updateCalendarWithEvents();
    });
  }

  private loadData(): void {
    this.calendarService.loadEventsForCurrentView();
  }

  private generateCalendarView(): void {
    this.currentView = this.calendarService.generateCalendarView(this.currentDate);
    // Don't call updateCalendarWithEvents here - it will be called by the data subscription
  }

  private updateCalendarWithEvents(): void {
    if (!this.currentView) return;

    // Convert tasks to calendar events
    const taskEvents = this.calendarService.convertTasksToEvents(this.tasks);
    
    // Deduplicate events by ID and title to prevent duplicates
    const allEventsMap = new Map<string, CalendarEvent>();
    
    // Add regular events first
    this.events.forEach(event => {
      allEventsMap.set(event._id, event);
    });
    
    // Add task events, but avoid duplicates
    taskEvents.forEach(taskEvent => {
      if (!allEventsMap.has(taskEvent._id)) {
        allEventsMap.set(taskEvent._id, taskEvent);
      }
    });
    
    const allEvents = Array.from(allEventsMap.values());

    // Update each day with its events
    this.currentView.weeks.forEach(week => {
      week.days.forEach(day => {
        day.events = allEvents.filter(event => 
          this.calendarService.isSameDay(new Date(event.startDate), day.date)
        );
        day.taskCount = day.events.filter(event => event.type === 'task').length;
      });
    });
  }

  // Navigation methods
  navigateToNextMonth(): void {
    this.calendarService.navigateToNextMonth();
  }

  navigateToPreviousMonth(): void {
    this.calendarService.navigateToPreviousMonth();
  }

  navigateToToday(): void {
    this.calendarService.navigateToToday();
  }


  // Day selection and smart event creation
  onDayClick(day: CalendarDay, event: MouseEvent): void {
    // Select the day
    this.selectedDate = day.date;
    
    // Only create event if clicking on current month days
    if (day.isCurrentMonth) {
      this.createEvent(day.date);
    }
  }

  selectDay(day: CalendarDay): void {
    this.selectedDate = day.date;
  }

  isSelectedDay(day: CalendarDay): boolean {
    return this.selectedDate ? 
      this.calendarService.isSameDay(day.date, this.selectedDate) : false;
  }

  // Event methods - removed duplicates, keeping improved versions below

  // Utility methods
  getCurrentMonthYear(): string {
    return `${this.months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  // Event creation
  createEvent(date?: Date): void {
    const dialogData: EventDialogData = {
      mode: 'create',
      date: date || new Date()
    };

    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '600px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Event was created successfully
        this.loadData();
      }
    });
  }

  // Event details
  viewEventDetails(event: CalendarEvent): void {
    const dialogData: EventDialogData = {
      mode: 'edit',
      event: event
    };

    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '600px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Event was updated successfully
        this.loadData();
      }
    });
  }

  // Event display methods
  getDayEvents(day: CalendarDay): CalendarEvent[] {
    // Show all events - let CSS handle overflow
    return day.events;
  }

  hasMoreEvents(day: CalendarDay): boolean {
    return false; // Don't show "more" indicator, show all events
  }

  getMoreEventsCount(day: CalendarDay): number {
    return 0;
  }

  // Get event color with better contrast
  getEventColor(event: CalendarEvent): string {
    if (event.color) {
      return event.color;
    }
    if (event.project?.color) {
      return event.project.color;
    }
    // Default colors based on event type
    switch (event.type) {
      case 'task':
        return '#f59e0b'; // amber
      case 'deadline':
        return '#ef4444'; // red
      default:
        return '#3b82f6'; // blue
    }
  }

  // Get appropriate icon for event type
  getEventTypeIcon(event: CalendarEvent): string {
    switch (event.type) {
      case 'task':
        return 'assignment';
      case 'deadline':
        return 'schedule';
      default:
        return 'event';
    }
  }

  // Format event time for display
  formatEventTime(event: CalendarEvent): string {
    if (event.allDay) {
      return 'All day';
    }
    const startTime = new Date(event.startDate);
    return startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Quick actions
  createQuickTask(date: Date): void {
    // Implementation for quick task creation
    console.log('Creating quick task for:', date);
  }

  viewAllEventsForDay(day: CalendarDay): void {
    // Implementation for viewing all events for a specific day
    this.selectDay(day);
    // Could open a dialog or sidebar showing all events
  }


  // Helper methods for template
  formatSelectedDate(): string {
    if (!this.selectedDate) return '';
    return this.calendarService.formatDate(this.selectedDate);
  }

}
