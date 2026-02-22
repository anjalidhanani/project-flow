import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SystemNotification {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  type: 'project_invitation' | 'task_assigned' | 'task_updated' | 'comment_added' | 'project_updated' | 'member_added' | 'member_removed' | 'deadline_reminder';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SystemNotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<SystemNotification[]>([]);

  public unreadCount$ = this.unreadCountSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getNotifications(unreadOnly: boolean = false, limit: number = 50, skip: number = 0): Observable<{
    notifications: SystemNotification[];
    unreadCount: number;
    total: number;
  }> {
    const params: any = { limit: limit.toString(), skip: skip.toString() };
    if (unreadOnly) {
      params.unreadOnly = 'true';
    }
    
    return this.http.get<{
      notifications: SystemNotification[];
      unreadCount: number;
      total: number;
    }>(this.apiUrl, { params });
  }

  markAsRead(notificationId: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/read-all`, {});
  }

  deleteNotification(notificationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${notificationId}`);
  }

  loadNotifications(): void {
    this.getNotifications().subscribe({
      next: (response) => {
        this.notificationsSubject.next(response.notifications);
        this.unreadCountSubject.next(response.unreadCount);
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  addNotification(notification: SystemNotification): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...currentNotifications]);
    
    if (!notification.isRead) {
      const currentCount = this.unreadCountSubject.value;
      this.unreadCountSubject.next(currentCount + 1);
    }
  }

  removeNotification(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const notification = currentNotifications.find(n => n._id === notificationId);
    const updatedNotifications = currentNotifications.filter(n => n._id !== notificationId);
    
    this.notificationsSubject.next(updatedNotifications);
    
    if (notification && !notification.isRead) {
      const currentCount = this.unreadCountSubject.value;
      this.unreadCountSubject.next(Math.max(0, currentCount - 1));
    }
  }

  markNotificationAsRead(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification => {
      if (notification._id === notificationId && !notification.isRead) {
        const currentCount = this.unreadCountSubject.value;
        this.unreadCountSubject.next(Math.max(0, currentCount - 1));
        return { ...notification, isRead: true, readAt: new Date() };
      }
      return notification;
    });
    
    this.notificationsSubject.next(updatedNotifications);
  }
}
