import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: {
    _id: string;
    name: string;
    color: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  estimatedHours: number;
  actualHours: number;
  tags: string[];
  attachments: any[];
  position: number;
  isArchived: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isOverdue?: boolean;
  daysUntilDue?: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  project: string;
  assignedTo?: string;
  priority?: string;
  dueDate?: Date;
  estimatedHours?: number;
  tags?: string[];
}

export interface TasksResponse {
  tasks: Task[];
  tasksByStatus?: {
    todo: Task[];
    'in-progress': Task[];
    review: Task[];
    completed: Task[];
  };
  total: number;
  page?: number;
  totalPages?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getTasks(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    project?: string;
    page?: number;
    limit?: number;
  }): Observable<TasksResponse> {
    const params: any = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] !== undefined) {
          params[key] = filters[key as keyof typeof filters];
        }
      });
    }
    return this.http.get<TasksResponse>(this.apiUrl, { params });
  }

  getTask(id: string): Observable<{ task: Task }> {
    return this.http.get<{ task: Task }>(`${this.apiUrl}/${id}`);
  }

  getProjectTasks(projectId: string, filters?: {
    status?: string;
    assignedTo?: string;
  }): Observable<TasksResponse> {
    const params: any = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] !== undefined) {
          params[key] = filters[key as keyof typeof filters];
        }
      });
    }
    return this.http.get<TasksResponse>(`${this.apiUrl}/project/${projectId}`, { params });
  }

  createTask(task: CreateTaskRequest): Observable<{ message: string; task: Task }> {
    return this.http.post<{ message: string; task: Task }>(this.apiUrl, task);
  }

  updateTask(id: string, updates: Partial<Task>): Observable<{ message: string; task: Task }> {
    return this.http.put<{ message: string; task: Task }>(
      `${this.apiUrl}/${id}`, 
      updates
    );
  }

  updateTaskPosition(id: string, position: number, status?: string): Observable<{ message: string; task: Task }> {
    return this.http.put<{ message: string; task: Task }>(
      `${this.apiUrl}/${id}/position`, 
      { position, status }
    );
  }

  deleteTask(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Comment methods
  getTaskComments(taskId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${taskId}/comments`);
  }

  addTaskComment(taskId: string, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${taskId}/comments`, { content });
  }

  updateTaskComment(taskId: string, commentId: string, content: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${taskId}/comments/${commentId}`, { content });
  }

  deleteTaskComment(taskId: string, commentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${taskId}/comments/${commentId}`);
  }
}
