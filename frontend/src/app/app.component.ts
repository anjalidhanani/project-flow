import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from './core/services/auth.service';
import { SocketService } from './core/services/socket.service';
import { NotificationService } from './core/services/notification.service';
import { NavigationComponent } from './shared/components/navigation/navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatMenuModule,
    MatBadgeModule,
    NavigationComponent
  ],
  template: `
    <div class="app-container" *ngIf="authService.isAuthenticated$ | async; else loginView">
      <app-navigation></app-navigation>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>

    <ng-template #loginView>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [`
    .app-container {
      display: flex;
      height: 100vh;
    }

    .main-content {
      flex: 1;
      overflow: auto;
      background-color: #fafafa;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    public authService: AuthService,
    private socketService: SocketService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Initialize socket connection when user is authenticated
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        if (isAuthenticated) {
          this.socketService.connect();
          this.setupSocketListeners();
        } else {
          this.socketService.disconnect();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.socketService.disconnect();
  }

  private setupSocketListeners() {
    // Listen for real-time notifications
    this.socketService.on('task-updated')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.notificationService.showSuccess(
          `Task "${data.updates.title || 'Unknown'}" was updated by ${data.updatedBy.name}`
        );
      });

    this.socketService.on('comment-added')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.notificationService.showInfo(
          `New comment added by ${data.comment.author.name}`
        );
      });

    this.socketService.on('member-added')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.notificationService.showSuccess(
          `${data.newMember.user.name} was added to the project`
        );
      });

    this.socketService.on('project-invitation')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.notificationService.showInfo(
          `You were invited to join a project by ${data.invitedBy.name}`
        );
      });
  }
}
