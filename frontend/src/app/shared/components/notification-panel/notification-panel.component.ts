import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemNotificationService, SystemNotification } from '../../../core/services/system-notification.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss']
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  notifications: SystemNotification[] = [];
  unreadCount = 0;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private systemNotificationService: SystemNotificationService,
    private invitationService: InvitationService,
    private notificationService: NotificationService,
    private router: Router
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
    this.isLoading = true;
    this.systemNotificationService.getNotifications(false, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications = response.notifications;
          this.unreadCount = response.unreadCount;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.isLoading = false;
        }
      });
  }

  private setupSubscriptions(): void {
    this.systemNotificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });

    this.systemNotificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
  }

  onNotificationClick(notification: SystemNotification): void {
    if (!notification.isRead) {
      this.markAsRead(notification._id);
    }

    // Handle different notification types
    switch (notification.type) {
      case 'project_invitation':
        // For project invitations, don't navigate to the project
        // The user should use the Accept/Decline buttons instead
        // Show a message to guide the user
        this.notificationService.showInfo('Use the Accept or Decline buttons to respond to the invitation');
        break;
      
      default:
        // For other notification types, navigate to actionUrl if available
        if (notification.actionUrl) {
          this.router.navigate([notification.actionUrl]);
        }
        break;
    }
  }

  markAsRead(notificationId: string): void {
    this.systemNotificationService.markAsRead(notificationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.systemNotificationService.markNotificationAsRead(notificationId);
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
          this.notificationService.showSuccess('All notifications marked as read');
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
          this.notificationService.showError('Failed to mark all notifications as read');
        }
      });
  }

  acceptInvitation(notification: SystemNotification, event: Event): void {
    event.stopPropagation();
    
    if (notification.type !== 'project_invitation' || !notification.data?.invitationId) {
      return;
    }

    this.invitationService.acceptInvitation(notification.data.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.showSuccess(`Successfully joined ${response.project.name}!`);
          this.markAsRead(notification._id);
          this.loadNotifications(); // Refresh notifications
        },
        error: (error) => {
          console.error('Error accepting invitation:', error);
          this.notificationService.showError('Failed to accept invitation');
        }
      });
  }

  declineInvitation(notification: SystemNotification, event: Event): void {
    event.stopPropagation();
    
    if (notification.type !== 'project_invitation' || !notification.data?.invitationId) {
      return;
    }

    this.invitationService.declineInvitation(notification.data.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.showInfo(`Declined invitation to ${response.project.name}`);
          this.markAsRead(notification._id);
          this.loadNotifications(); // Refresh notifications
        },
        error: (error) => {
          console.error('Error declining invitation:', error);
          this.notificationService.showError('Failed to decline invitation');
        }
      });
  }

  deleteNotification(notification: SystemNotification, event: Event): void {
    event.stopPropagation();
    
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
}
