import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from './auth.service';

export interface UserStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalAssignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalCreatedTasks: number;
  projectsByRole: {
    owner: number;
    admin: number;
    manager: number;
    developer: number;
    viewer: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  searchUsers(query: string, limit: number = 10): Observable<{ users: User[] }> {
    const params = { q: query, limit: limit.toString() };
    return this.http.get<{ users: User[] }>(`${this.apiUrl}/search`, { params });
  }

  getUserStats(): Observable<{ stats: UserStats }> {
    return this.http.get<{ stats: UserStats }>(`${this.apiUrl}/stats`);
  }

  getTeamMembers(): Observable<{ team: any[]; total: number }> {
    return this.http.get<{ team: any[]; total: number }>(`${this.apiUrl}/team`);
  }

  getUserProfile(id: string): Observable<{ user: User & { projectCount: number; bio?: string; location?: string; website?: string; theme?: string; emailNotifications?: boolean; desktopNotifications?: boolean } }> {
    const endpoint = id === 'me' ? `${this.apiUrl}/profile` : `${this.apiUrl}/profile/${id}`;
    return this.http.get<{ user: User & { projectCount: number; bio?: string; location?: string; website?: string; theme?: string; emailNotifications?: boolean; desktopNotifications?: boolean } }>(endpoint);
  }

  updateProfile(profileData: { name?: string; email?: string; bio?: string; location?: string; website?: string }): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/profile`, profileData);
  }

  changePassword(passwordData: { currentPassword: string; newPassword: string; confirmPassword: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/change-password`, passwordData);
  }

}
