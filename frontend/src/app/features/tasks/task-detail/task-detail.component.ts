import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { TaskService, Task } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { TaskEditDialogComponent } from '../task-edit-dialog/task-edit-dialog.component';
import { Subject, takeUntil, filter } from 'rxjs';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface TaskComment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  task: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited?: boolean;
}

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="task-detail-container" *ngIf="!isLoading && task">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="task-info">
          <h1>{{ task.title }}</h1>
          <p class="project-name">{{ task.project.name }}</p>
        </div>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="editTask()">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
        </div>
      </div>

      <div class="content-layout">
        <!-- Left Column -->
        <div class="left-column">
          <mat-card class="description-card">
            <mat-card-header>
              <mat-card-title>Description</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p *ngIf="task.description; else noDescription" class="description-text">{{ task.description }}</p>
              <ng-template #noDescription>
                <p class="no-content">No description provided</p>
              </ng-template>
            </mat-card-content>
          </mat-card>

          <mat-card class="tags-card" *ngIf="task.tags?.length">
            <mat-card-header>
              <mat-card-title>Tags</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="tags-container">
                <mat-chip-listbox>
                  <mat-chip *ngFor="let tag of task.tags" class="task-tag">{{ tag }}</mat-chip>
                </mat-chip-listbox>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Comments Section -->
          <mat-card class="comments-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>chat_bubble_outline</mat-icon>
                Comments
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- Add Comment Form -->
              <form [formGroup]="commentForm" (ngSubmit)="addComment()" class="comment-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Add a comment...</mat-label>
                  <textarea matInput 
                           formControlName="content" 
                           rows="3" 
                           placeholder="Share your thoughts, updates, or questions about this task">
                  </textarea>
                  <mat-error *ngIf="commentForm.get('content')?.hasError('required')">
                    Comment cannot be empty
                  </mat-error>
                </mat-form-field>
                <div class="comment-form-actions">
                  <button mat-raised-button 
                          color="primary" 
                          type="submit" 
                          [disabled]="commentForm.invalid || isAddingComment">
                    <mat-icon *ngIf="isAddingComment">hourglass_empty</mat-icon>
                    <mat-icon *ngIf="!isAddingComment">send</mat-icon>
                    {{ isAddingComment ? 'Adding...' : 'Add Comment' }}
                  </button>
                </div>
              </form>

              <!-- Comments List -->
              <div class="comments-list" *ngIf="comments.length > 0">
                <div class="comment" *ngFor="let comment of comments; trackBy: trackByCommentId">
                  <div class="comment-avatar">
                    <div class="avatar-circle" [style.background-color]="getAvatarColor(comment.author.name)">
                      {{ comment.author.name.charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <div class="comment-content">
                    <div class="comment-header">
                      <span class="author-name">{{ comment.author.name }}</span>
                      <span class="comment-time">{{ getTimeAgo(comment.createdAt) }}</span>
                      <span class="edited-indicator" *ngIf="comment.isEdited">(edited)</span>
                    </div>
                    <div class="comment-text" *ngIf="editingCommentId !== comment._id">
                      {{ comment.content }}
                    </div>
                    <!-- Edit Form -->
                    <form *ngIf="editingCommentId === comment._id" 
                          [formGroup]="editCommentForm" 
                          (ngSubmit)="saveEditComment(comment._id)"
                          class="edit-form">
                      <mat-form-field appearance="outline" class="full-width">
                        <textarea matInput formControlName="content" rows="3"></textarea>
                      </mat-form-field>
                      <div class="edit-actions">
                        <button mat-button type="button" (click)="cancelEditComment()">Cancel</button>
                        <button mat-raised-button color="primary" type="submit" [disabled]="editCommentForm.invalid">
                          Save
                        </button>
                      </div>
                    </form>
                    <div class="comment-actions" *ngIf="canEditComment(comment)">
                      <button mat-icon-button (click)="startEditComment(comment)" *ngIf="editingCommentId !== comment._id">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button (click)="deleteComment(comment._id)" class="delete-btn">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No Comments Message -->
              <div class="no-comments" *ngIf="comments.length === 0">
                <mat-icon>chat_bubble_outline</mat-icon>
                <p>No comments yet. Be the first to share your thoughts!</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Right Column -->
        <div class="right-column">
          <mat-card class="details-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>info_outline</mat-icon>
                Task Details
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="details-grid">
                <div class="detail-row">
                  <span class="detail-label">Status</span>
                  <span class="status-badge" [ngClass]="'status-' + task.status">
                    <mat-icon class="status-icon">{{ getStatusIcon(task.status) }}</mat-icon>
                    {{ task.status | titlecase }}
                  </span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Priority</span>
                  <span class="priority-badge" [ngClass]="'priority-' + task.priority">
                    <mat-icon class="priority-icon">{{ getPriorityIcon(task.priority) }}</mat-icon>
                    {{ task.priority | titlecase }}
                  </span>
                </div>
                
                <div class="detail-row" *ngIf="task.assignedTo">
                  <span class="detail-label">Assigned to</span>
                  <div class="user-info">
                    <div class="user-avatar" [style.background-color]="getAvatarColor(task.assignedTo.name)">
                      {{ task.assignedTo.name.charAt(0).toUpperCase() }}
                    </div>
                    <span class="user-name">{{ task.assignedTo.name }}</span>
                  </div>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Created by</span>
                  <div class="user-info">
                    <div class="user-avatar" [style.background-color]="getAvatarColor(task.createdBy.name)">
                      {{ task.createdBy.name.charAt(0).toUpperCase() }}
                    </div>
                    <span class="user-name">{{ task.createdBy.name }}</span>
                  </div>
                </div>
                
                <div class="detail-row" *ngIf="task.dueDate">
                  <span class="detail-label">Due date</span>
                  <span class="due-date" [class.overdue]="task.isOverdue">
                    <mat-icon>schedule</mat-icon>
                    {{ task.dueDate | date:'MMM d, y' }}
                  </span>
                </div>
                
                <div class="detail-row" *ngIf="task.estimatedHours > 0">
                  <span class="detail-label">Estimated</span>
                  <span class="time-info">
                    <mat-icon>access_time</mat-icon>
                    {{ task.estimatedHours }}h
                  </span>
                </div>
                
                <div class="detail-row" *ngIf="task.actualHours > 0">
                  <span class="detail-label">Actual</span>
                  <span class="time-info">
                    <mat-icon>timer</mat-icon>
                    {{ task.actualHours }}h
                  </span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Created</span>
                  <span class="date-info">
                    <mat-icon>event</mat-icon>
                    {{ task.createdAt | date:'MMM d, y' }}
                  </span>
                </div>
                
                <div class="detail-row" *ngIf="task.completedAt">
                  <span class="detail-label">Completed</span>
                  <span class="date-info">
                    <mat-icon>check_circle</mat-icon>
                    {{ task.completedAt | date:'MMM d, y' }}
                  </span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>

    <div class="loading" *ngIf="isLoading">
      <mat-spinner></mat-spinner>
      <p>Loading task...</p>
    </div>
  `,
  styles: [`
    .task-detail-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8fafc;
      min-height: 100vh;
    }

    .header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 32px;
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .task-info {
      flex: 1;
    }

    .task-info h1 {
      margin: 0 0 8px 0;
      font-size: 2rem;
      font-weight: 700;
      color: #1a202c;
      line-height: 1.2;
    }

    .project-name {
      margin: 0;
      color: #718096;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .project-name::before {
      content: "📁";
      font-size: 0.75rem;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .content-layout {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 32px;
      align-items: start;
    }

    .left-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .right-column {
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      padding-right: 8px;
      
      /* Custom scrollbar styling */
      &::-webkit-scrollbar {
        width: 6px;
      }
      
      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
        
        &:hover {
          background: #a8a8a8;
        }
      }
    }

    .description-card,
    .tags-card,
    .comments-card,
    .details-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: none;
    }

    .description-card .mat-mdc-card-header,
    .tags-card .mat-mdc-card-header,
    .comments-card .mat-mdc-card-header,
    .details-card .mat-mdc-card-header {
      padding-bottom: 8px;
    }

    .description-card .mat-mdc-card-title,
    .tags-card .mat-mdc-card-title,
    .comments-card .mat-mdc-card-title,
    .details-card .mat-mdc-card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #2d3748;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .description-text {
      line-height: 1.6;
      color: #4a5568;
      margin: 0;
      white-space: pre-wrap;
    }

    .tags-container {
      margin-top: 8px;
    }

    .task-tag {
      background: #edf2f7;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }

    .details-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-weight: 600;
      color: #4a5568;
      font-size: 0.875rem;
    }

    .status-badge,
    .priority-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-icon,
    .priority-icon {
      font-size: 16px !important;
      width: 16px;
      height: 16px;
    }

    .status-todo { background: #ebf8ff; color: #2b6cb0; border: 1px solid #bee3f8; }
    .status-in-progress { background: #fef5e7; color: #c05621; border: 1px solid #fbd38d; }
    .status-review { background: #faf5ff; color: #805ad5; border: 1px solid #d6bcfa; }
    .status-completed { background: #f0fff4; color: #38a169; border: 1px solid #9ae6b4; }

    .priority-low { background: #f7fafc; color: #4a5568; border: 1px solid #cbd5e0; }
    .priority-medium { background: #fef5e7; color: #c05621; border: 1px solid #fbd38d; }
    .priority-high { background: #fed7d7; color: #c53030; border: 1px solid #feb2b2; }
    .priority-urgent { background: #fbb6ce; color: #b83280; border: 1px solid #f687b3; }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .user-name {
      font-weight: 500;
      color: #2d3748;
    }

    .due-date,
    .time-info,
    .date-info {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #4a5568;
      font-weight: 500;
    }

    .due-date mat-icon,
    .time-info mat-icon,
    .date-info mat-icon {
      font-size: 18px !important;
      width: 18px;
      height: 18px;
      color: #718096;
    }

    .overdue {
      color: #e53e3e !important;
    }

    .overdue mat-icon {
      color: #e53e3e !important;
    }

    .no-content {
      color: #a0aec0;
      font-style: italic;
      text-align: center;
      padding: 24px;
    }

    .loading {
      text-align: center;
      padding: 48px;
    }

    .loading p {
      margin-top: 16px;
      color: #718096;
    }

    // Comments Section Styles
    .comment-form {
      margin-bottom: 24px;
    }

    .comment-form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 24px;
    }

    .comment {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #f7fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }

    .comment:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: #cbd5e0;
    }

    .comment-avatar {
      flex-shrink: 0;
    }

    .avatar-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .comment-content {
      flex: 1;
      position: relative;
    }

    .comment-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .author-name {
      font-weight: 600;
      color: #2d3748;
      font-size: 0.875rem;
    }

    .comment-time {
      color: #718096;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .edited-indicator {
      color: #a0aec0;
      font-size: 0.75rem;
      font-style: italic;
    }

    .comment-text {
      color: #4a5568;
      line-height: 1.6;
      white-space: pre-wrap;
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .comment-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
      background: white;
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .comment:hover .comment-actions {
      opacity: 1;
    }

    .delete-btn {
      color: #e53e3e;
    }

    .delete-btn:hover {
      background: #fed7d7;
    }

    .edit-form {
      margin-bottom: 12px;
    }

    .edit-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .no-comments {
      text-align: center;
      padding: 48px 24px;
      color: #a0aec0;
      background: #f7fafc;
      border-radius: 12px;
      border: 2px dashed #e2e8f0;

      mat-icon {
        font-size: 48px !important;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      p {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
      }
    }

    .full-width {
      width: 100%;
    }

    // Responsive Design
    @media (max-width: 1024px) {
      .content-layout {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .right-column {
        position: static;
        order: -1;
      }

      .task-detail-container {
        padding: 16px;
      }

      .header {
        padding: 20px;
        margin-bottom: 24px;
      }
    }

    @media (max-width: 768px) {
      .task-info h1 {
        font-size: 1.5rem;
      }

      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .actions {
        align-self: stretch;
      }

      .comment {
        padding: 12px;
      }

      .avatar-circle {
        width: 32px;
        height: 32px;
        font-size: 14px;
        order: 2;
        align-self: flex-start;
      }
    }
  `]
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  task: Task | null = null;
  comments: TaskComment[] = [];
  commentForm: FormGroup;
  editCommentForm: FormGroup;
  isLoading = true;
  isAddingComment = false;
  editingCommentId: string | null = null;
  private destroy$ = new Subject<void>();
  private referrerUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private location: Location,
    private fb: FormBuilder
  ) {
    // Check if we have navigation state with referrer info
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['referrer']) {
      this.referrerUrl = navigation.extras.state['referrer'];
    }

    // Initialize forms
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1)]]
    });

    this.editCommentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    if (taskId) {
      this.loadTask(taskId);
      this.loadComments(taskId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTask(taskId: string): void {
    this.taskService.getTask(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.task = response.task;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading task:', error);
          this.notificationService.showError('Failed to load task');
          this.isLoading = false;
        }
      });
  }

  goBack(): void {
    // If we have a referrer URL, navigate back to it
    if (this.referrerUrl) {
      this.router.navigateByUrl(this.referrerUrl);
      return;
    }

    // Try to use browser's back navigation if available
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    // Fallback to tasks list
    this.router.navigate(['/tasks']);
  }

  editTask(): void {
    if (!this.task) return;

    const dialogRef = this.dialog.open(TaskEditDialogComponent, {
      width: '600px',
      data: { task: this.task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTask(this.task!._id);
      }
    });
  }

  // Comments functionality
  private loadComments(taskId: string): void {
    this.taskService.getTaskComments(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.comments = response.comments || [];
        },
        error: (error) => {
          console.error('Error loading comments:', error);
          this.comments = [];
        }
      });
  }

  addComment(): void {
    if (this.commentForm.invalid || !this.task) return;

    this.isAddingComment = true;
    const content = this.commentForm.get('content')?.value.trim();

    this.taskService.addTaskComment(this.task._id, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.comments.push(response.comment);
          this.commentForm.reset();
          this.commentForm.markAsUntouched();
          this.commentForm.markAsPristine();
          this.commentForm.get('content')?.setErrors(null);
          this.isAddingComment = false;
          this.notificationService.showSuccess('Comment added successfully');
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          this.notificationService.showError('Failed to add comment');
          this.isAddingComment = false;
        }
      });
  }

  startEditComment(comment: TaskComment): void {
    this.editingCommentId = comment._id;
    this.editCommentForm.patchValue({ content: comment.content });
  }

  saveEditComment(commentId: string): void {
    if (this.editCommentForm.invalid || !this.task) return;

    const content = this.editCommentForm.get('content')?.value.trim();

    this.taskService.updateTaskComment(this.task._id, commentId, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const index = this.comments.findIndex(c => c._id === commentId);
          if (index !== -1) {
            this.comments[index] = response.comment;
          }
          this.cancelEditComment();
          this.notificationService.showSuccess('Comment updated successfully');
        },
        error: (error) => {
          console.error('Error updating comment:', error);
          this.notificationService.showError('Failed to update comment');
        }
      });
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editCommentForm.reset();
  }

  deleteComment(commentId: string): void {
    if (!this.task) return;

    if (confirm('Are you sure you want to delete this comment?')) {
      this.taskService.deleteTaskComment(this.task._id, commentId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.comments = this.comments.filter(c => c._id !== commentId);
            this.notificationService.showSuccess('Comment deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting comment:', error);
            this.notificationService.showError('Failed to delete comment');
          }
        });
    }
  }

  canEditComment(comment: TaskComment): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;
    
    // Check if current user is the author of the comment
    return comment.author._id === currentUser.id;
  }

  trackByCommentId(index: number, comment: TaskComment): string {
    return comment._id;
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return commentDate.toLocaleDateString();
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'todo': return 'radio_button_unchecked';
      case 'in-progress': return 'play_circle_outline';
      case 'review': return 'rate_review';
      case 'completed': return 'check_circle';
      default: return 'help_outline';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'low': return 'keyboard_arrow_down';
      case 'medium': return 'remove';
      case 'high': return 'keyboard_arrow_up';
      case 'urgent': return 'priority_high';
      default: return 'help_outline';
    }
  }
}
