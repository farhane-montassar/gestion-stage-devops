import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { StudentsComponent } from './pages/students/students.component';
import { CompaniesComponent } from './pages/companies/companies.component';
import { OffersComponent } from './pages/offers/offers.component';
import { ApplicationsComponent } from './pages/applications/applications.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { LayoutComponent } from './components/layout/layout.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },

      // Réservé à l'admin
      {
        path: 'students',
        component: StudentsComponent,
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'companies',
        component: CompaniesComponent,
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },

      // Accessibles à tous les rôles connectés (gestion fine gérée dans les composants)
      { path: 'offers', component: OffersComponent },
      { path: 'applications', component: ApplicationsComponent },

      // Profil : CV (student) / logo (company). Contenu gated par rôle.
      { path: 'profile', component: ProfileComponent }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
