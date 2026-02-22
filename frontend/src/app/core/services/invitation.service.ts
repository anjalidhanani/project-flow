import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Invitation {
  _id: string;
  project: {
    _id: string;
    name: string;
    description: string;
  };
  invitedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private readonly apiUrl = `${environment.apiUrl}/invitations`;

  constructor(private http: HttpClient) {}

  getPendingInvitations(): Observable<{ invitations: Invitation[] }> {
    return this.http.get<{ invitations: Invitation[] }>(this.apiUrl);
  }

  acceptInvitation(invitationId: string): Observable<{ message: string; member: any; project: any }> {
    return this.http.post<{ message: string; member: any; project: any }>(
      `${this.apiUrl}/${invitationId}/accept`, 
      {}
    );
  }

  declineInvitation(invitationId: string): Observable<{ message: string; project: any }> {
    return this.http.post<{ message: string; project: any }>(
      `${this.apiUrl}/${invitationId}/decline`, 
      {}
    );
  }
}
