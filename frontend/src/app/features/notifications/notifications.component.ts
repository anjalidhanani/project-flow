import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemNotificationService, SystemNotification } from '../../core/services/system-notification.service';
import { InvitationService } from '../../core/services/invitation.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: SystemNotification[] = [];
  unreadNotifications: SystemNotification[] = [];
  readNotifications: SystemNotification[] = [];
  unreadCount = 0;
  isLoading = false;
  selectedTab = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private systemNotificationService: SystemNotificationService,
    private invitationService: InvitationService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotifications(): void {
    // Check if user is authenticated before loading notifications
    if (!this.isUserAuthenticated()) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.systemNotificationService.getNotifications(false, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications = response.notifications;
          this.unreadCount = response.unreadCount;
          this.filterNotifications();
          this.isLoading = false;
        },
        error: (error) => {
          // Handle authentication errors gracefully
          if (error.status === 401) {
            console.log('User not authenticated, skipping notification load');
            this.notifications = [];
            this.unreadNotifications = [];
            this.readNotifications = [];
            this.unreadCount = 0;
          } else {
            console.error('Error loading notifications:', error);
          }
          this.isLoading = false;
        }
      });
  }

  private setupSubscriptions(): void {
    this.systemNotificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
        this.filterNotifications();
      });

    this.systemNotificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
  }

  private filterNotifications(): void {
    this.unreadNotifications = this.notifications.filter(n => !n.isRead);
    this.readNotifications = this.notifications.filter(n => n.isRead);
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
  }

  markAsRead(notification: SystemNotification): void {
    if (notification.isRead) return;

    this.systemNotificationService.markAsRead(notification._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.systemNotificationService.markNotificationAsRead(notification._id);
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  markAllAsRead(): void {
    this.systemNotificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.systemNotificationService.updateUnreadCount(0);
          this.notifications = this.notifications.map(n => ({ ...n, isRead: true, readAt: new Date() }));
          this.filterNotifications();
          this.notificationService.showSuccess('All notifications marked as read');
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
          this.notificationService.showError('Failed to mark all notifications as read');
        }
      });
  }

  acceptInvitation(notification: SystemNotification): void {
    console.log('Accept invitation clicked:', notification);
    
    if (notification.type !== 'project_invitation') {
      console.error('Not a project invitation:', notification.type);
      this.notificationService.showError('This is not a project invitation');
      return;
    }
    
    if (!notification.data?.invitationId) {
      console.error('No invitation ID found in notification data:', notification.data);
      this.notificationService.showError('Invalid invitation data');
      return;
    }

    console.log('Accepting invitation with ID:', notification.data.invitationId);
    
    this.invitationService.acceptInvitation(notification.data.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Invitation accepted successfully:', response);
          this.notificationService.showSuccess(`Successfully joined ${response.project.name}!`);
          
          // Reload notifications to reflect database changes
          this.loadNotifications();
        },
        error: (error) => {
          console.error('Error accepting invitation:', error);
          this.notificationService.showError('Failed to accept invitation: ' + (error.error?.message || error.message));
        }
      });
  }

  declineInvitation(notification: SystemNotification): void {
    console.log('Decline invitation clicked:', notification);
    
    if (notification.type !== 'project_invitation') {
      console.error('Not a project invitation:', notification.type);
      this.notificationService.showError('This is not a project invitation');
      return;
    }
    
    if (!notification.data?.invitationId) {
      console.error('No invitation ID found in notification data:', notification.data);
      this.notificationService.showError('Invalid invitation data');
      return;
    }

    console.log('Declining invitation with ID:', notification.data.invitationId);

    this.invitationService.declineInvitation(notification.data.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Invitation declined successfully:', response);
          this.notificationService.showInfo(`Declined invitation to ${response.project.name}`);
          
          // Reload notifications to reflect database changes
          this.loadNotifications();
        },
        error: (error) => {
          console.error('Error declining invitation:', error);
          this.notificationService.showError('Failed to decline invitation: ' + (error.error?.message || error.message));
        }
      });
  }

  deleteNotification(notification: SystemNotification): void {
    this.systemNotificationService.deleteNotification(notification._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.systemNotificationService.removeNotification(notification._id);
          this.notificationService.showSuccess('Notification deleted');
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
          this.notificationService.showError('Failed to delete notification');
        }
      });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'project_invitation':
        return 'group_add';
      case 'task_assigned':
        return 'assignment_ind';
      case 'task_updated':
        return 'assignment';
      case 'comment_added':
        return 'comment';
      case 'project_updated':
        return 'folder';
      case 'member_added':
        return 'person_add';
      case 'member_removed':
        return 'person_remove';
      case 'deadline_reminder':
        return 'schedule';
      default:
        return 'notifications';
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  trackByNotificationId(index: number, notification: SystemNotification): string {
    return notification._id;
  }

  private isUserAuthenticated(): boolean {
    // Check if user has a valid token
    return !!localStorage.getItem('token');
  }

  private updateNotificationStatusImmediately(notification: SystemNotification, status: 'accepted' | 'declined'): void {
    console.log('Immediately updating notification status to:', status);
    
    // Update notification status and recreate arrays to trigger change detection
    this.notifications = this.notifications.map(n => {
      if (n._id === notification._id) {
        return {
          ...n,
          data: { ...n.data, status: status },
          isRead: true,
          readAt: new Date()
        };
      }
      return n;
    });
    
    // Update unread notifications array
    this.unreadNotifications = this.unreadNotifications.map(n => {
      if (n._id === notification._id) {
        return {
          ...n,
          data: { ...n.data, status: status },
          isRead: true,
          readAt: new Date()
        };
      }
      return n;
    });
    
    // Update the notifications arrays
    this.filterNotifications();
    
    // Force change detection to update UI immediately
    this.cdr.detectChanges();
    
    console.log('UI updated immediately, buttons should be hidden now');
  }

  isInvitationPending(notification: SystemNotification): boolean {
    // Check if invitation is still pending (not accepted, declined, or cancelled)
    // We can check this by looking at the invitation status in the data
    const isPending = !notification.data?.status || notification.data?.status === 'pending';
    return isPending;
  }

  getInvitationStatusClass(notification: SystemNotification): string {
    const status = notification.data?.status;
    switch (status) {
      case 'accepted':
        return 'status-accepted';
      case 'declined':
        return 'status-declined';
      case 'expired':
        return 'status-expired';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  getInvitationStatusText(notification: SystemNotification): string {
    const status = notification.data?.status;
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'declined':
        return 'Declined';
      case 'expired':
        return 'Expired';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  getInvitationStatusIcon(notification: SystemNotification): string {
    const status = notification.data?.status;
    switch (status) {
      case 'accepted':
        return 'check_circle';
      case 'declined':
        return 'cancel';
      case 'expired':
        return 'access_time';
      case 'cancelled':
        return 'block';
      default:
        return 'schedule';
    }
  }
}
