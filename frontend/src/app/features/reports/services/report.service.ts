import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ProjectProgressReport {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  overdueTasks: number;
  averageTaskDuration: number;
  createdAt: Date;
  deadline?: Date;
}

export interface TaskAnalyticsReport {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  tasksByProject: Array<{
    projectId: string;
    projectName: string;
    taskCount: number;
  }>;
  averageCompletionTime: number;
  productivityTrends: Array<{
    date: string;
    tasksCompleted: number;
    tasksCreated: number;
  }>;
}

export interface UserActivityReport {
  userId: string;
  userName: string;
  tasksAssigned: number;
  tasksCompleted: number;
  projectsInvolved: number;
  commentsPosted: number;
  lastActivity: Date;
  productivityScore: number;
  activityTimeline: Array<{
    date: string;
    activityType: string;
    description: string;
  }>;
}

export interface CustomReportFilter {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  projectIds?: string[];
  userIds?: string[];
  taskStatuses?: string[];
  priorities?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getProjectProgressReports(projectIds?: string[]): Observable<ProjectProgressReport[]> {
    const params: any = {};
    if (projectIds && projectIds.length > 0) {
      params.projectIds = projectIds.join(',');
    }
    return this.http.get<ProjectProgressReport[]>(`${this.apiUrl}/project-progress`, { params });
  }

  getTaskAnalytics(filters?: CustomReportFilter): Observable<TaskAnalyticsReport> {
    return this.http.post<TaskAnalyticsReport>(`${this.apiUrl}/task-analytics`, filters || {});
  }

  getUserActivityReports(userIds?: string[]): Observable<UserActivityReport[]> {
    const params: any = {};
    if (userIds && userIds.length > 0) {
      params.userIds = userIds.join(',');
    }
    return this.http.get<UserActivityReport[]>(`${this.apiUrl}/user-activity`, { params });
  }

  generateCustomReport(filters: CustomReportFilter): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/custom`, filters);
  }

  exportReport(reportType: string, format: 'csv', filters?: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/export`, {
      reportType,
      format,
      filters
    }, {
      responseType: 'blob'
    });
  }

  getDashboardSummary(): Observable<{
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    activeUsers: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/dashboard-summary`);
  }
}
