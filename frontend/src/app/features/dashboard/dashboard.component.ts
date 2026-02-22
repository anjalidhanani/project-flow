import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { UserService, UserStats } from '../../core/services/user.service';
import { ProjectService } from '../../core/services/project.service';
import { SocketService } from '../../core/services/socket.service';
import { InviteMemberDialogComponent } from '../projects/invite-member-dialog/invite-member-dialog.component';
import { Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser$: Observable<User | null>;
  stats: UserStats | null = null;
  isLoading = true;
  recentProjects: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private projectService: ProjectService,
    private socketService: SocketService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Only load data if user is authenticated
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.loadDashboardData();
          this.connectSocket();
        } else {
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    // Load user stats
    this.userService.getUserStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stats = response.stats;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.isLoading = false;
          // If 401, redirect to login
          if (error.status === 401) {
            this.authService.logout();
          }
        }
      });

    // Load recent projects
    this.projectService.getProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recentProjects = response.projects.slice(0, 5);
        },
        error: (error) => {
          console.error('Error loading recent projects:', error);
          // If 401, redirect to login
          if (error.status === 401) {
            this.authService.logout();
          }
        }
      });

  }

  private connectSocket(): void {
    this.socketService.connect();
  }

  getTimeOfDay(): string {
    const now = new Date();
    const hour = now.getHours();
    
    // Debug log to check current time
    console.log('Current time:', now.toLocaleString(), 'Hour:', hour);
    
    if (hour >= 5 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  getCompletionRate(): number {
    if (!this.stats || this.stats.totalAssignedTasks === 0) {
      return 0;
    }
    return Math.round((this.stats.completedTasks / this.stats.totalAssignedTasks) * 100);
  }

  getProjectsProgress(): number {
    if (!this.stats || this.stats.totalProjects === 0) {
      return 0;
    }
    return Math.round((this.stats.activeProjects / this.stats.totalProjects) * 100);
  }


  getCircumference(): number {
    return 2 * Math.PI * 16; // radius = 16
  }

  getStrokeDashoffset(progress: number): number {
    const circumference = this.getCircumference();
    return circumference - (progress / 100) * circumference;
  }


  viewProject(projectId: string): void {
    this.router.navigate(['/projects', projectId]);
  }

  createProject(): void {
    this.router.navigate(['/projects/create']);
  }

  viewProjects(): void {
    this.router.navigate(['/projects']);
  }

  viewTasks(): void {
    this.router.navigate(['/tasks']);
  }

  createTask(): void {
    this.router.navigate(['/tasks/create']);
  }

  navigateToTeam(): void {
    // Check if user has any projects to invite members to
    if (this.recentProjects.length === 0) {
      // If no projects, navigate to create project first
      this.router.navigate(['/projects/create']);
      return;
    }

    // If user has projects, show a selection dialog or use the most recent project
    const mostRecentProject = this.recentProjects[0];
    
    const dialogRef = this.dialog.open(InviteMemberDialogComponent, {
      width: '600px',
      data: {
        projectId: mostRecentProject._id,
        projectName: mostRecentProject.name,
        existingMembers: mostRecentProject.members || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh dashboard data to show updated member count
        this.loadDashboardData();
      }
    });
  }

  navigateToReports(): void {
    this.router.navigate(['/reports']);
  }
}
