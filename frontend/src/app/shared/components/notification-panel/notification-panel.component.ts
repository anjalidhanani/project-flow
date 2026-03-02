import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
    private router: Router,
    private cdr: ChangeDetectorRef
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

    // Immediately update the notification status in the UI
    this.updateNotificationStatusImmediately(notification, 'accepted');

    this.invitationService.acceptInvitation(notification.data.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.showSuccess(`Successfully joined ${response.project.name}!`);
          this.markAsRead(notification._id);
          // Don't reload notifications since we already updated the UI
        },
        error: (error) => {
          console.error('Error accepting invitation:', error);
          this.notificationService.showError('Failed to accept invitation');
          // Revert the UI change on error
          this.updateNotificationStatusImmediately(notification, 'pending');
        }
      });
  }

  declineInvitation(notification: SystemNotification, event: Event): void {
    event.stopPropagation();
    
    if (notification.type !== 'project_invitation' || !notification.data?.invitationId) {
      return;
    }

    // Immediately update the notification status in the UI
    this.updateNotificationStatusImmediately(notification, 'declined');

    this.invitationService.declineInvitation(notification.data.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.showInfo(`Declined invitation to ${response.project.name}`);
          this.markAsRead(notification._id);
          // Don't reload notifications since we already updated the UI
        },
        error: (error) => {
          console.error('Error declining invitation:', error);
          this.notificationService.showError('Failed to decline invitation');
          // Revert the UI change on error
          this.updateNotificationStatusImmediately(notification, 'pending');
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

  private updateNotificationStatusImmediately(notification: SystemNotification, status: 'accepted' | 'declined' | 'pending'): void {
    console.log('Updating notification status immediately:', notification._id, 'to', status);
    console.log('Current notification data:', notification.data);
    
    // Find and update the specific notification
    const notificationIndex = this.notifications.findIndex(n => n._id === notification._id);
    if (notificationIndex !== -1) {
      // Create a completely new array to ensure Angular detects the change
      const updatedNotifications = [...this.notifications];
      updatedNotifications[notificationIndex] = {
        ...this.notifications[notificationIndex],
        data: { 
          ...this.notifications[notificationIndex].data, 
          status: status 
        },
        isRead: status !== 'pending' ? true : this.notifications[notificationIndex].isRead,
        readAt: status !== 'pending' ? new Date() : this.notifications[notificationIndex].readAt
      };
      
      this.notifications = updatedNotifications;
      console.log('Updated notification data:', this.notifications[notificationIndex].data);
      console.log('All notifications after update:', this.notifications.map(n => ({ id: n._id, status: n.data?.status })));
    }
    
    // Force change detection to update UI immediately
    this.cdr.detectChanges();
    console.log('Change detection triggered');
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  // Debug method to check what template sees
  shouldShowButtons(notification: SystemNotification): boolean {
    const shouldShow = !notification.data?.status || notification.data?.status === 'pending';
    console.log(`Should show buttons for ${notification._id}:`, shouldShow, 'Status:', notification.data?.status);
    return shouldShow;
  }

  shouldShowStatus(notification: SystemNotification): boolean {
    const shouldShow = notification.data?.status && notification.data?.status !== 'pending';
    console.log(`Should show status for ${notification._id}:`, shouldShow, 'Status:', notification.data?.status);
    return shouldShow;
  }
}
