import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { AuthService, User } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="profile-container">
      <div class="profile-header">
        <h2>
          <mat-icon>person</mat-icon>
          Profile Settings
        </h2>
        <p class="profile-subtitle">Manage your account settings and preferences</p>
      </div>

      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading profile...</p>
      </div>

      <div *ngIf="!isLoading && currentUser" class="profile-content">
        <mat-tab-group class="profile-tabs" animationDuration="300ms">
          <!-- Personal Information Tab -->
          <mat-tab label="Personal Info">
            <div class="tab-content">
              <mat-card class="profile-card">
                <mat-card-header>
                  <mat-card-title>Personal Information</mat-card-title>
                  <mat-card-subtitle>Update your basic profile information</mat-card-subtitle>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="profile-avatar-section">
                    <div class="profile-avatar" [style.background-color]="getAvatarColor(currentUser.name)">
                      <span>{{ getInitials(currentUser.name) }}</span>
                    </div>
                    <div class="avatar-info">
                      <h3>{{ currentUser.name }}</h3>
                      <p>{{ currentUser.email }}</p>
                      <p class="member-since">Member since {{ currentUser.createdAt ? formatDate(currentUser.createdAt) : 'Unknown' }}</p>
                    </div>
                  </div>

                  <form [formGroup]="profileForm" (ngSubmit)="updateProfile()" class="profile-form">
                    <div class="form-row">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Full Name</mat-label>
                        <input matInput formControlName="name" placeholder="Enter your full name">
                        <mat-icon matSuffix>person</mat-icon>
                        <mat-error *ngIf="profileForm.get('name')?.hasError('required')">
                          Name is required
                        </mat-error>
                        <mat-error *ngIf="profileForm.get('name')?.hasError('minlength')">
                          Name must be at least 2 characters
                        </mat-error>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Email Address</mat-label>
                        <input matInput formControlName="email" type="email" placeholder="Enter your email">
                        <mat-icon matSuffix>email</mat-icon>
                        <mat-error *ngIf="profileForm.get('email')?.hasError('required')">
                          Email is required
                        </mat-error>
                        <mat-error *ngIf="profileForm.get('email')?.hasError('email')">
                          Please enter a valid email
                        </mat-error>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Bio</mat-label>
                        <textarea matInput formControlName="bio" rows="3" placeholder="Tell us about yourself"></textarea>
                        <mat-icon matSuffix>description</mat-icon>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline" class="half-width">
                        <mat-label>Location</mat-label>
                        <input matInput formControlName="location" placeholder="City, Country">
                        <mat-icon matSuffix>location_on</mat-icon>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="half-width">
                        <mat-label>Website</mat-label>
                        <input matInput formControlName="website" placeholder="https://example.com">
                        <mat-icon matSuffix>link</mat-icon>
                      </mat-form-field>
                    </div>

                    <div class="form-actions">
                      <button mat-raised-button color="primary" type="submit" 
                              [disabled]="profileForm.invalid || isUpdatingProfile">
                        <mat-icon *ngIf="isUpdatingProfile">hourglass_empty</mat-icon>
                        <mat-icon *ngIf="!isUpdatingProfile">save</mat-icon>
                        {{ isUpdatingProfile ? 'Updating...' : 'Update Profile' }}
                      </button>
                    </div>
                  </form>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Security Tab -->
          <mat-tab label="Security">
            <div class="tab-content">
              <mat-card class="profile-card">
                <mat-card-header>
                  <mat-card-title>Change Password</mat-card-title>
                  <mat-card-subtitle>Update your account password</mat-card-subtitle>
                </mat-card-header>
                
                <mat-card-content>
                  <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="profile-form">
                    <div class="form-row">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Current Password</mat-label>
                        <input matInput formControlName="currentPassword" type="password" 
                               placeholder="Enter current password">
                        <mat-icon matSuffix>lock</mat-icon>
                        <mat-error *ngIf="passwordForm.get('currentPassword')?.hasError('required')">
                          Current password is required
                        </mat-error>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>New Password</mat-label>
                        <input matInput formControlName="newPassword" type="password" 
                               placeholder="Enter new password">
                        <mat-icon matSuffix>lock_outline</mat-icon>
                        <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('required')">
                          New password is required
                        </mat-error>
                        <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('minlength')">
                          Password must be at least 6 characters
                        </mat-error>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Confirm New Password</mat-label>
                        <input matInput formControlName="confirmPassword" type="password" 
                               placeholder="Confirm new password">
                        <mat-icon matSuffix>lock_outline</mat-icon>
                        <mat-error *ngIf="passwordForm.get('confirmPassword')?.hasError('required')">
                          Please confirm your password
                        </mat-error>
                        <mat-error *ngIf="passwordForm.get('confirmPassword')?.hasError('mismatch')">
                          Passwords do not match
                        </mat-error>
                      </mat-form-field>
                    </div>

                    <div class="form-actions">
                      <button mat-raised-button color="primary" type="submit" 
                              [disabled]="passwordForm.invalid || isChangingPassword">
                        <mat-icon *ngIf="isChangingPassword">hourglass_empty</mat-icon>
                        <mat-icon *ngIf="!isChangingPassword">security</mat-icon>
                        {{ isChangingPassword ? 'Changing...' : 'Change Password' }}
                      </button>
                    </div>
                  </form>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

        </mat-tab-group>
      </div>
    </div>
  `,
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  
  isLoading = true;
  isUpdatingProfile = false;
  isChangingPassword = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.profileForm = this.createProfileForm();
    this.passwordForm = this.createPasswordForm();
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createProfileForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      bio: [''],
      location: [''],
      website: ['']
    });
  }

  private createPasswordForm(): FormGroup {
    return this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }


  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
    } else if (confirmPassword?.hasError('mismatch')) {
      confirmPassword.setErrors(null);
    }
    
    return null;
  }

  private loadProfile(): void {
    this.userService.getUserProfile('me')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.currentUser = response.user;
          this.populateForms();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading profile:', error);
          this.notificationService.showError('Failed to load profile');
          this.isLoading = false;
        }
      });
  }

  private populateForms(): void {
    if (this.currentUser) {
      this.profileForm.patchValue({
        name: this.currentUser.name,
        email: this.currentUser.email,
        bio: (this.currentUser as any).bio || '',
        location: (this.currentUser as any).location || '',
        website: (this.currentUser as any).website || ''
      });
    }
  }

  updateProfile(): void {
    if (this.profileForm.valid) {
      this.isUpdatingProfile = true;
      
      this.userService.updateProfile(this.profileForm.value)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.notificationService.showSuccess('Profile updated successfully');
            this.currentUser = response.user;
            this.isUpdatingProfile = false;
          },
          error: (error: any) => {
            console.error('Error updating profile:', error);
            let errorMessage = 'Failed to update profile';
            
            if (error.error?.errors && Array.isArray(error.error.errors)) {
              errorMessage = error.error.errors.map((err: any) => err.msg).join(', ');
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }
            
            this.notificationService.showError(errorMessage);
            this.isUpdatingProfile = false;
          }
        });
    }
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      this.isChangingPassword = true;
      
      this.userService.changePassword(this.passwordForm.value)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Password changed successfully');
            this.passwordForm.reset();
            this.passwordForm.markAsUntouched();
            this.passwordForm.markAsPristine();
            Object.keys(this.passwordForm.controls).forEach(key => {
              this.passwordForm.get(key)?.setErrors(null);
            });
            this.isChangingPassword = false;
          },
          error: (error: any) => {
            console.error('Error changing password:', error);
            this.notificationService.showError(error.error?.message || 'Failed to change password');
            this.isChangingPassword = false;
          }
        });
    }
  }


  getAvatarColor(name: string): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
      '#f97316', '#6366f1', '#14b8a6', '#f43f5e'
    ];
    
    if (!name) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  }
}
