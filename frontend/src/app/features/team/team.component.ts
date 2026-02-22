import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  primaryRole: string;
  projectCount: number;
  projects: {
    name: string;
    role: string;
  }[];
}

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  template: `
<div class="team-container">
  <div class="team-header">
    <h2>
      <mat-icon>groups</mat-icon>
      Team Members
    </h2>
    <p class="team-subtitle">View all team members across your projects</p>
  </div>

  <div *ngIf="isLoading" class="loading-container">
    <mat-spinner></mat-spinner>
    <p>Loading team members...</p>
  </div>

  <div *ngIf="!isLoading && teamMembers.length === 0" class="empty-state">
    <mat-icon class="empty-icon">group_off</mat-icon>
    <h3>No Team Members Found</h3>
    <p>You don't have any team members in your projects yet.</p>
  </div>

  <div *ngIf="!isLoading && teamMembers.length > 0" class="team-grid">
    <mat-card *ngFor="let member of teamMembers" class="member-card">
      <mat-card-header>
        <div mat-card-avatar class="member-avatar" [style.background-color]="getAvatarColor(member.name)">
          <span *ngIf="!member.avatar">{{ getInitials(member.name) }}</span>
          <img *ngIf="member.avatar" [src]="member.avatar" [alt]="member.name">
        </div>
        <mat-card-title>{{ member.name }}</mat-card-title>
        <mat-card-subtitle>{{ member.email }}</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="member-info">
          <div class="primary-role">
            <mat-icon [style.color]="getRoleColor(member.primaryRole)">
              {{ getRoleIcon(member.primaryRole) }}
            </mat-icon>
            <span class="role-text">{{ member.primaryRole | titlecase }}</span>
          </div>

          <div class="project-count" matTooltip="Number of shared projects">
            <mat-icon>folder</mat-icon>
            <span>{{ member.projectCount }} project{{ member.projectCount !== 1 ? 's' : '' }}</span>
          </div>
        </div>

        <div class="projects-section" *ngIf="member.projects.length > 0">
          <h4>Shared Projects:</h4>
          <div class="projects-list">
            <mat-chip-listbox>
              <mat-chip-option 
                *ngFor="let project of member.projects" 
                [matTooltip]="'Role: ' + (project.role | titlecase)"
                class="project-chip">
                {{ project.name }}
                <mat-icon matChipTrailingIcon [style.color]="getRoleColor(project.role)">
                  {{ getRoleIcon(project.role) }}
                </mat-icon>
              </mat-chip-option>
            </mat-chip-listbox>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  </div>
</div>
  `,
  styleUrls: ['./team.component.scss']
})
export class TeamComponent implements OnInit, OnDestroy {
  teamMembers: TeamMember[] = [];
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTeamMembers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTeamMembers(): void {
    this.userService.getTeamMembers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { team: any[]; total: number }) => {
          this.teamMembers = response.team;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading team members:', error);
          this.notificationService.showError('Failed to load team members');
          this.isLoading = false;
        }
      });
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
      '#f97316', '#6366f1', '#14b8a6', '#f43f5e'
    ];
    
    if (!name) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'owner': return '#ef4444';
      case 'admin': return '#f59e0b';
      case 'manager': return '#3b82f6';
      case 'developer': return '#10b981';
      case 'viewer': return '#6b7280';
      default: return '#6b7280';
    }
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'owner': return 'star';
      case 'admin': return 'admin_panel_settings';
      case 'manager': return 'manage_accounts';
      case 'developer': return 'code';
      case 'viewer': return 'visibility';
      default: return 'person';
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
