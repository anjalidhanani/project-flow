import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatDividerModule,
    MatTabsModule,
    MatChipsModule
  ],
  template: `
    <div class="help-container">
      <div class="help-header">
        <h1>
          <mat-icon>help_center</mat-icon>
          Help & Support
        </h1>
        <p class="help-subtitle">Get the most out of ProjectFlow with our comprehensive guides and support resources</p>
      </div>

      <div class="help-content">
        <mat-tab-group class="help-tabs" animationDuration="300ms">
          <!-- Getting Started Tab -->
          <mat-tab label="Getting Started">
            <div class="tab-content">
              <mat-card class="help-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>rocket_launch</mat-icon>
                    Welcome to ProjectFlow
                  </mat-card-title>
                  <mat-card-subtitle>Your comprehensive project management solution</mat-card-subtitle>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="getting-started-grid">
                    <div class="step-card">
                      <div class="step-number">1</div>
                      <h3>Create Your First Project</h3>
                      <p>Start by creating a new project from the Projects page. Add a clear title, description, and set your project timeline.</p>
                      <mat-chip-set>
                        <mat-chip>Projects</mat-chip>
                        <mat-chip>Setup</mat-chip>
                      </mat-chip-set>
                    </div>

                    <div class="step-card">
                      <div class="step-number">2</div>
                      <h3>Invite Team Members</h3>
                      <p>Collaborate with your team by inviting members to your project. Assign roles and permissions as needed.</p>
                      <mat-chip-set>
                        <mat-chip>Team</mat-chip>
                        <mat-chip>Collaboration</mat-chip>
                      </mat-chip-set>
                    </div>

                    <div class="step-card">
                      <div class="step-number">3</div>
                      <h3>Create Tasks</h3>
                      <p>Break down your project into manageable tasks. Set priorities, due dates, and assign them to team members.</p>
                      <mat-chip-set>
                        <mat-chip>Tasks</mat-chip>
                        <mat-chip>Planning</mat-chip>
                      </mat-chip-set>
                    </div>

                    <div class="step-card">
                      <div class="step-number">4</div>
                      <h3>Track Progress</h3>
                      <p>Monitor your project's progress through the dashboard, reports, and real-time updates.</p>
                      <mat-chip-set>
                        <mat-chip>Dashboard</mat-chip>
                        <mat-chip>Reports</mat-chip>
                      </mat-chip-set>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- FAQ Tab -->
          <mat-tab label="FAQ">
            <div class="tab-content">
              <mat-card class="help-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>quiz</mat-icon>
                    Frequently Asked Questions
                  </mat-card-title>
                  <mat-card-subtitle>Find quick answers to common questions</mat-card-subtitle>
                </mat-card-header>
                
                <mat-card-content>
                  <mat-accordion class="faq-accordion">
                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>How do I create a new project?</mat-panel-title>
                      </mat-expansion-panel-header>
                      <p>To create a new project:</p>
                      <ol>
                        <li>Navigate to the Projects page from the sidebar</li>
                        <li>Click the "Create Project" button</li>
                        <li>Fill in the project details (name, description, timeline)</li>
                        <li>Set the project visibility and permissions</li>
                        <li>Click "Create" to save your project</li>
                      </ol>
                    </mat-expansion-panel>

                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>How do I invite team members to a project?</mat-panel-title>
                      </mat-expansion-panel-header>
                      <p>To invite team members:</p>
                      <ol>
                        <li>Open your project from the Projects page</li>
                        <li>Go to the "Members" section</li>
                        <li>Click "Invite Member"</li>
                        <li>Enter the email address of the person you want to invite</li>
                        <li>Select their role (Admin, Manager, Developer, or Viewer)</li>
                        <li>Send the invitation</li>
                      </ol>
                    </mat-expansion-panel>

                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>How do I assign tasks to team members?</mat-panel-title>
                      </mat-expansion-panel-header>
                      <p>To assign tasks:</p>
                      <ol>
                        <li>Create a new task or edit an existing one</li>
                        <li>In the task form, find the "Assigned To" field</li>
                        <li>Select a team member from the dropdown</li>
                        <li>Set the priority and due date</li>
                        <li>Save the task</li>
                      </ol>
                    </mat-expansion-panel>

                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>How do I track project progress?</mat-panel-title>
                      </mat-expansion-panel-header>
                      <p>You can track progress through:</p>
                      <ul>
                        <li><strong>Dashboard:</strong> Overview of all your projects and tasks</li>
                        <li><strong>Project Details:</strong> Individual project progress and statistics</li>
                        <li><strong>Reports:</strong> Detailed analytics and progress reports</li>
                        <li><strong>Calendar:</strong> Timeline view of tasks and deadlines</li>
                      </ul>
                    </mat-expansion-panel>

                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>What are the different user roles?</mat-panel-title>
                      </mat-expansion-panel-header>
                      <p>ProjectFlow has four user roles:</p>
                      <ul>
                        <li><strong>Owner:</strong> Full access to all project features and settings</li>
                        <li><strong>Admin:</strong> Can manage project settings, members, and tasks</li>
                        <li><strong>Manager:</strong> Can create and assign tasks, view reports</li>
                        <li><strong>Developer:</strong> Can update task status and add comments</li>
                        <li><strong>Viewer:</strong> Read-only access to project information</li>
                      </ul>
                    </mat-expansion-panel>

                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>How do I change my password?</mat-panel-title>
                      </mat-expansion-panel-header>
                      <p>To change your password:</p>
                      <ol>
                        <li>Click on your profile picture in the top right corner</li>
                        <li>Select "Profile Settings"</li>
                        <li>Go to the "Security" tab</li>
                        <li>Enter your current password</li>
                        <li>Enter and confirm your new password</li>
                        <li>Click "Change Password"</li>
                      </ol>
                    </mat-expansion-panel>
                  </mat-accordion>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- User Guide Tab -->
          <mat-tab label="User Guide">
            <div class="tab-content">
              <div class="guide-grid">
                <mat-card class="guide-card">
                  <mat-card-header>
                    <mat-card-title>
                      <mat-icon>dashboard</mat-icon>
                      Dashboard
                    </mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <p>Your central hub for project overview and quick access to important information.</p>
                    <ul>
                      <li>View project statistics and progress</li>
                      <li>See recent activities and updates</li>
                      <li>Quick access to your tasks</li>
                      <li>Upcoming deadlines and events</li>
                    </ul>
                  </mat-card-content>
                </mat-card>

                <mat-card class="guide-card">
                  <mat-card-header>
                    <mat-card-title>
                      <mat-icon>folder</mat-icon>
                      Projects
                    </mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <p>Manage all your projects in one place with comprehensive project management tools.</p>
                    <ul>
                      <li>Create and organize projects</li>
                      <li>Manage team members and roles</li>
                      <li>Track project progress</li>
                      <li>Set project timelines and milestones</li>
                    </ul>
                  </mat-card-content>
                </mat-card>

                <mat-card class="guide-card">
                  <mat-card-header>
                    <mat-card-title>
                      <mat-icon>task</mat-icon>
                      Tasks
                    </mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <p>Create, assign, and track tasks to keep your projects moving forward.</p>
                    <ul>
                      <li>Create detailed task descriptions</li>
                      <li>Set priorities and due dates</li>
                      <li>Assign tasks to team members</li>
                      <li>Track task progress and status</li>
                    </ul>
                  </mat-card-content>
                </mat-card>

                <mat-card class="guide-card">
                  <mat-card-header>
                    <mat-card-title>
                      <mat-icon>calendar_today</mat-icon>
                      Calendar
                    </mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <p>Visualize your project timeline and manage important dates and deadlines.</p>
                    <ul>
                      <li>View tasks and events in calendar format</li>
                      <li>Create and manage events</li>
                      <li>Set reminders for important dates</li>
                      <li>Sync with external calendars</li>
                    </ul>
                  </mat-card-content>
                </mat-card>

                <mat-card class="guide-card">
                  <mat-card-header>
                    <mat-card-title>
                      <mat-icon>assessment</mat-icon>
                      Reports
                    </mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <p>Generate detailed reports and analytics to track performance and progress.</p>
                    <ul>
                      <li>Project progress reports</li>
                      <li>Team performance analytics</li>
                      <li>Task completion statistics</li>
                      <li>Custom report generation</li>
                    </ul>
                  </mat-card-content>
                </mat-card>

                <mat-card class="guide-card">
                  <mat-card-header>
                    <mat-card-title>
                      <mat-icon>group</mat-icon>
                      Team
                    </mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <p>View and manage your team members across all projects.</p>
                    <ul>
                      <li>See all team members</li>
                      <li>View member roles and projects</li>
                      <li>Track team collaboration</li>
                      <li>Manage team permissions</li>
                    </ul>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <!-- Contact Support Tab -->
          <mat-tab label="Contact Support">
            <div class="tab-content">
              <mat-card class="help-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>support_agent</mat-icon>
                    Contact Support
                  </mat-card-title>
                  <mat-card-subtitle>Get help when you need it most</mat-card-subtitle>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="contact-grid">
                    <div class="contact-method">
                      <mat-icon class="contact-icon">email</mat-icon>
                      <h3>Email Support</h3>
                      <p>Send us a detailed message and we'll get back to you within 24 hours.</p>
                      <button mat-raised-button color="primary">
                        <mat-icon>mail</mat-icon>
                        support&#64;projectflow.com
                      </button>
                    </div>

                    <div class="contact-method">
                      <mat-icon class="contact-icon">chat</mat-icon>
                      <h3>Live Chat</h3>
                      <p>Chat with our support team in real-time during business hours.</p>
                      <button mat-raised-button color="accent">
                        <mat-icon>chat</mat-icon>
                        Start Live Chat
                      </button>
                    </div>

                    <div class="contact-method">
                      <mat-icon class="contact-icon">help_outline</mat-icon>
                      <h3>Help Center</h3>
                      <p>Browse our comprehensive knowledge base for detailed guides and tutorials.</p>
                      <button mat-raised-button>
                        <mat-icon>library_books</mat-icon>
                        Visit Help Center
                      </button>
                    </div>

                    <div class="contact-method">
                      <mat-icon class="contact-icon">bug_report</mat-icon>
                      <h3>Report a Bug</h3>
                      <p>Found an issue? Let us know so we can fix it quickly.</p>
                      <button mat-raised-button color="warn">
                        <mat-icon>bug_report</mat-icon>
                        Report Bug
                      </button>
                    </div>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="support-hours">
                    <h3>
                      <mat-icon>schedule</mat-icon>
                      Support Hours
                    </h3>
                    <div class="hours-grid">
                      <div class="hours-item">
                        <strong>Monday - Friday</strong>
                        <span>9:00 AM - 6:00 PM (IST)</span>
                      </div>
                      <div class="hours-item">
                        <strong>Saturday</strong>
                        <span>10:00 AM - 4:00 PM (IST)</span>
                      </div>
                      <div class="hours-item">
                        <strong>Sunday</strong>
                        <span>Closed</span>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styleUrls: ['./help.component.scss']
})
export class HelpComponent {
  constructor() {}
}
