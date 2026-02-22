import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Project {
  _id: string;
  name: string;
  description: string;
  owner: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: Date;
  endDate: Date;
  dueDate?: Date;
  budget: number;
  color: string;
  tags: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  memberRole?: string;
  permissions?: any;
  taskCount?: number;
  completedTaskCount?: number;
  progress?: number;
  memberCount?: number;
  members?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  }[];
}

export interface ProjectMember {
  _id: string;
  project: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  role: 'owner' | 'admin' | 'manager' | 'developer' | 'viewer';
  permissions: any;
  joinedAt: Date;
  invitedBy?: any;
  status: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  priority?: string;
  budget?: number;
  color?: string;
  tags?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjects(status?: string): Observable<{ projects: Project[]; total: number }> {
    const params: any = {};
    if (status) {
      params.status = status;
    }
    return this.http.get<{ projects: Project[]; total: number }>(this.apiUrl, { params });
  }

  getProject(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createProject(project: CreateProjectRequest): Observable<{ message: string; project: Project }> {
    return this.http.post<{ message: string; project: Project }>(this.apiUrl, project);
  }

  updateProject(id: string, updates: Partial<Project>): Observable<{ message: string; project: Project }> {
    return this.http.put<{ message: string; project: Project }>(
      `${this.apiUrl}/${id}`, 
      updates
    );
  }

  deleteProject(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getProjectMembers(projectId: string): Observable<{ members: ProjectMember[] }> {
    return this.http.get<{ members: ProjectMember[] }>(`${this.apiUrl}/${projectId}/members`);
  }

  inviteMember(projectId: string, inviteData: { email: string; role?: string; message?: string }): Observable<{ message: string; invitation: any }> {
    return this.http.post<{ message: string; invitation: any }>(
      `${this.apiUrl}/${projectId}/invite`, 
      inviteData
    );
  }

  // Keep the old method for backward compatibility but mark as deprecated
  /** @deprecated Use inviteMember instead */
  addMember(projectId: string, memberData: { email: string; role?: string }): Observable<{ message: string; member: ProjectMember }> {
    return this.inviteMember(projectId, memberData) as any;
  }

  updateMemberRole(projectId: string, memberId: string, role: string): Observable<{ message: string; member: ProjectMember }> {
    return this.http.put<{ message: string; member: ProjectMember }>(
      `${this.apiUrl}/${projectId}/members/${memberId}`, 
      { role }
    );
  }

  removeMember(projectId: string, memberId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${projectId}/members/${memberId}`);
  }
}
