import { Routes } from '@angular/router';

export const projectRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./project-list/project-list.component').then(m => m.ProjectListComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./project-create/project-create.component').then(m => m.ProjectCreateComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./project-edit/project-edit.component').then(m => m.ProjectEditComponent)
  }
];
