import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SocketService } from '../../../core/services/socket.service';
import { User } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable, of, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs';

export interface InviteMemberData {
  projectId: string;
  projectName: string;
  existingMembers: any[];
}

@Component({
  selector: 'app-invite-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatChipsModule
  ],
  templateUrl: './invite-member-dialog.component.html',
  styleUrls: ['./invite-member-dialog.component.scss']
})
export class InviteMemberDialogComponent implements OnInit {
  inviteForm: FormGroup;
  isLoading = false;
  searchResults: User[] = [];
  filteredUsers: Observable<User[]> = of([]);
  selectedUsers: User[] = [];

  roles = [
    { value: 'viewer', label: 'Viewer', description: 'Can view project and tasks' },
    { value: 'developer', label: 'Developer', description: 'Can create and edit tasks' },
    { value: 'manager', label: 'Manager', description: 'Can manage tasks and project settings' },
    { value: 'admin', label: 'Admin', description: 'Full project access except deletion' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InviteMemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InviteMemberData,
    private projectService: ProjectService,
    private userService: UserService,
    private notificationService: NotificationService,
    private socketService: SocketService,
    private http: HttpClient
  ) {
    this.inviteForm = this.fb.group({
      email: [''], // Remove required validation since we use selectedUsers array
      role: ['developer', Validators.required]
    });
  }

  ngOnInit(): void {
    this.setupUserSearch();
  }

  private setupUserSearch(): void {
    const emailControl = this.inviteForm.get('email');
    if (emailControl) {
      this.filteredUsers = emailControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          if (typeof value === 'string' && value.length >= 2) {
            return this.searchUsers(value);
          }
          return of([]);
        })
      );
    }
  }

  private searchUsers(query: string): Observable<User[]> {
    return this.userService.searchUsers(query).pipe(
      switchMap(response => {
        // Filter out existing members
        const existingMemberEmails = this.data.existingMembers.map(m => 
          m.user?.email || m.email
        );
        const filteredUsers = response.users.filter(user => 
          !existingMemberEmails.includes(user.email)
        );
        return of(filteredUsers);
      })
    );
  }

  onUserSelected(user: User): void {
    if (user && user.email) {
      this.inviteForm.patchValue({ email: user.email });
      // Add the user to selected users immediately
      const existingUser = this.selectedUsers.find(u => u.email === user.email);
      if (!existingUser) {
        this.selectedUsers.push(user);
        // Clear the input after selection
        this.inviteForm.patchValue({ email: '' });
      }
    }
  }

  displayUser(user: User): string {
    // Return empty string to keep input clean after selection
    return '';
  }

  addUserByEmail(): void {
    const email = this.inviteForm.get('email')?.value;
    if (email && this.inviteForm.get('email')?.valid) {
      // Check if user is already selected
      const existingUser = this.selectedUsers.find(u => u.email === email);
      if (!existingUser) {
        // Check if it's from search results
        const searchUser = this.searchResults.find(u => u.email === email);
        if (searchUser) {
          this.selectedUsers.push(searchUser);
        } else {
          // Add as email-only user
          this.selectedUsers.push({
            id: '',
            name: email.split('@')[0],
            email: email,
            role: 'member'
          });
        }
        this.inviteForm.patchValue({ email: '' });
      }
    }
  }

  removeUser(user: User): void {
    this.selectedUsers = this.selectedUsers.filter(u => u.email !== user.email);
  }

  onSubmit(): void {
    console.log('Form submitted!', this.inviteForm.valid, this.selectedUsers.length);
    
    if (this.selectedUsers.length === 0) {
      this.notificationService.showError('Please select at least one user to invite');
      return;
    }

    const role = this.inviteForm.get('role')?.value;
    if (!role) {
      this.notificationService.showError('Please select a role for the invited members');
      return;
    }

    this.isLoading = true;
    console.log('Inviting users:', this.selectedUsers, 'with role:', role);
    this.inviteUsers(this.selectedUsers, role);
  }

  private inviteUsers(users: User[], role: string): void {
    const invitePromises = users.map(user => 
      this.http.post(`${environment.apiUrl}/projects/${this.data.projectId}/invite`, {
        email: user.email,
        role: role
      }).toPromise()
    );

    Promise.allSettled(invitePromises)
      .then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (successful > 0) {
          this.notificationService.showSuccess(
            `Successfully sent ${successful} invitation${successful > 1 ? 's' : ''}! Members will be notified when they log in.`
          );

          this.dialogRef.close(true);
        }

        if (failed > 0) {
          this.notificationService.showError(
            `Failed to send ${failed} invitation${failed > 1 ? 's' : ''}`
          );
        }

        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error sending invitations:', error);
        this.notificationService.showError('Failed to send invitations');
        this.isLoading = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
