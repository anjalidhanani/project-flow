import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private eventSubjects: { [key: string]: Subject<any> } = {};

  constructor(private authService: AuthService) {}

  connect(): void {
    const token = this.authService.getToken();
    if (!token) return;

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    // Setup event listeners for real-time events
    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clean up event subjects
    Object.values(this.eventSubjects).forEach(subject => subject.complete());
    this.eventSubjects = {};
  }

  emit(event: string, data?: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string): Observable<any> {
    if (!this.eventSubjects[event]) {
      this.eventSubjects[event] = new Subject<any>();
    }
    return this.eventSubjects[event].asObservable();
  }

  joinProject(projectId: string): void {
    this.emit('join-project', projectId);
  }

  leaveProject(projectId: string): void {
    this.emit('leave-project', projectId);
  }

  emitTaskUpdate(data: {
    taskId: string;
    projectId: string;
    updates: any;
    action: 'created' | 'updated' | 'deleted' | 'status-changed';
  }): void {
    this.emit('task-updated', data);
  }

  emitCommentAdded(data: {
    commentId: string;
    taskId: string;
    projectId: string;
    comment: any;
  }): void {
    this.emit('comment-added', data);
  }

  emitProjectUpdate(data: {
    projectId: string;
    updates: any;
    action: 'updated' | 'status-changed' | 'member-added' | 'member-removed';
  }): void {
    this.emit('project-updated', data);
  }

  emitMemberAdded(data: {
    projectId: string;
    newMember: any;
    project?: any;
  }): void {
    this.emit('member-added', data);
  }

  startTyping(taskId: string, projectId: string): void {
    this.emit('typing-start', { taskId, projectId });
  }

  stopTyping(taskId: string, projectId: string): void {
    this.emit('typing-stop', { taskId, projectId });
  }

  updatePresence(projectId: string, status: 'online' | 'away' | 'busy'): void {
    this.emit('update-presence', { projectId, status });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    const events = [
      'user-joined-project',
      'user-left-project',
      'task-updated',
      'comment-added',
      'project-updated',
      'member-added',
      'project-invitation',
      'user-typing',
      'user-presence-updated',
      'user-disconnected'
    ];

    events.forEach(event => {
      this.socket!.on(event, (data: any) => {
        if (this.eventSubjects[event]) {
          this.eventSubjects[event].next(data);
        }
      });
    });
  }
}
