import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Task } from './task.service';

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  type: 'event' | 'task' | 'deadline';
  project?: {
    _id: string;
    name: string;
    color: string;
  };
  task?: {
    _id: string;
    title: string;
    status: string;
    priority: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  attendees?: string[];
  location?: string;
  color?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  isPrivate?: boolean;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  project?: string;
  attendees?: string[];
  location?: string;
  color?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  isPrivate?: boolean;
}

export interface CalendarView {
  month: Date;
  weeks: CalendarWeek[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  taskCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private readonly apiUrl = `${environment.apiUrl}/calendar`;
  private currentViewSubject = new BehaviorSubject<Date>(new Date());
  private eventsSubject = new BehaviorSubject<CalendarEvent[]>([]);

  currentView$ = this.currentViewSubject.asObservable();
  events$ = this.eventsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Event CRUD operations
  getEvents(startDate?: Date, endDate?: Date): Observable<{ events: CalendarEvent[] }> {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    
    return this.http.get<{ events: CalendarEvent[] }>(this.apiUrl, { params });
  }

  getEvent(id: string): Observable<{ event: CalendarEvent }> {
    return this.http.get<{ event: CalendarEvent }>(`${this.apiUrl}/${id}`);
  }

  createEvent(event: CreateEventRequest): Observable<{ message: string; event: CalendarEvent }> {
    return this.http.post<{ message: string; event: CalendarEvent }>(this.apiUrl, event);
  }

  updateEvent(id: string, updates: Partial<CreateEventRequest>): Observable<{ message: string; event: CalendarEvent }> {
    return this.http.put<{ message: string; event: CalendarEvent }>(`${this.apiUrl}/${id}`, updates);
  }

  deleteEvent(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Calendar view management
  setCurrentView(date: Date): void {
    this.currentViewSubject.next(date);
  }

  getCurrentView(): Date {
    return this.currentViewSubject.value;
  }

  // Calendar generation utilities
  generateCalendarView(date: Date): CalendarView {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the first day of the calendar (might be from previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Get the last day of the calendar (might be from next month)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const weeks: CalendarWeek[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const week: CalendarDay[] = [];
      
      for (let i = 0; i < 7; i++) {
        const day: CalendarDay = {
          date: new Date(currentDate),
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: this.isToday(currentDate),
          events: [],
          taskCount: 0
        };
        
        week.push(day);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push({ days: week });
    }
    
    return {
      month: new Date(year, month, 1),
      weeks
    };
  }

  // Utility methods
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Task integration methods
  convertTasksToEvents(tasks: Task[]): CalendarEvent[] {
    return tasks
      .filter(task => task.dueDate)
      .map(task => ({
        _id: `task-${task._id}`,
        title: task.title,
        description: task.description,
        startDate: new Date(task.dueDate!),
        endDate: new Date(task.dueDate!),
        allDay: true,
        type: 'task' as const,
        project: task.project,
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority
        },
        createdBy: task.createdBy,
        color: this.getTaskColor(task.priority),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
  }

  private getTaskColor(priority: string): string {
    const colors = {
      'urgent': '#ef4444',
      'high': '#f97316',
      'medium': '#eab308',
      'low': '#22c55e'
    };
    return colors[priority as keyof typeof colors] || '#6b7280';
  }

  // Navigation helpers
  navigateToNextMonth(): void {
    const current = this.getCurrentView();
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.setCurrentView(next);
  }

  navigateToPreviousMonth(): void {
    const current = this.getCurrentView();
    const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.setCurrentView(previous);
  }

  navigateToToday(): void {
    this.setCurrentView(new Date());
  }

  // Load events for current view
  loadEventsForCurrentView(): void {
    const currentView = this.getCurrentView();
    const startOfMonth = new Date(currentView.getFullYear(), currentView.getMonth(), 1);
    const endOfMonth = new Date(currentView.getFullYear(), currentView.getMonth() + 1, 0);
    
    this.getEvents(startOfMonth, endOfMonth).subscribe({
      next: (response) => {
        this.eventsSubject.next(response.events);
      },
      error: (error) => {
        console.error('Error loading calendar events:', error);
        this.eventsSubject.next([]);
      }
    });
  }
}
