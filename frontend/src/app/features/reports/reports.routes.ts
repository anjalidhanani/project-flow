import { Routes } from '@angular/router';

export const reportRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./report-dashboard/report-dashboard.component').then(m => m.ReportDashboardComponent)
  },
  {
    path: 'project-progress',
    loadComponent: () => import('./project-progress/project-progress.component').then(m => m.ProjectProgressComponent)
  },
  {
    path: 'task-analytics',
    loadComponent: () => import('./task-analytics/task-analytics.component').then(m => m.TaskAnalyticsComponent)
  },
  {
    path: 'user-activity',
    loadComponent: () => import('./user-activity/user-activity.component').then(m => m.UserActivityComponent)
  },
  {
    path: 'custom',
    loadComponent: () => import('./custom-reports/custom-reports.component').then(m => m.CustomReportsComponent)
  }
];
