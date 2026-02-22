import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService, User } from '../../../core/services/auth.service';
import { SystemNotificationService } from '../../../core/services/system-notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    NotificationPanelComponent
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  currentUser$: Observable<User | null>;
  isCollapsed = false;
  isMobileMenuOpen = false;
  currentRoute = '';

  private pageTitle: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/projects': 'Projects',
    '/tasks': 'My Tasks',
    '/calendar': 'Calendar',
    '/reports': 'Reports',
    '/team': 'Team',
    '/profile': 'Profile',
    '/help': 'Help & Support'
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private systemNotificationService: SystemNotificationService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Track route changes for breadcrumb
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.currentRoute = event.urlAfterRedirects;
        }
      });

    // Check if sidebar should be collapsed on mobile
    this.checkScreenSize();
    
    // Load notifications when component initializes
    this.systemNotificationService.loadNotifications();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    if (window.innerWidth <= 768) {
      this.isCollapsed = true;
    }
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  getCurrentPageTitle(): string {
    // Find the most specific route match
    const routes = Object.keys(this.pageTitle).sort((a, b) => b.length - a.length);
    const matchedRoute = routes.find(route => this.currentRoute.startsWith(route));
    
    if (matchedRoute) {
      return this.pageTitle[matchedRoute];
    }

    // Handle dynamic routes
    if (this.currentRoute.includes('/projects/') && !this.currentRoute.includes('/create')) {
      return 'Project Details';
    }
    if (this.currentRoute.includes('/tasks/') && !this.currentRoute.includes('/create')) {
      return 'Task Details';
    }
    if (this.currentRoute.includes('/create')) {
      return 'Create New';
    }

    return 'ProjectFlow';
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c', 
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    
    if (!name) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  logout(): void {
    this.authService.logout();
  }
}
