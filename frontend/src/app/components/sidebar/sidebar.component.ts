import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard', roles: ['admin', 'student', 'company'] },
    { label: 'Étudiants', icon: '🎓', route: '/students', roles: ['admin'] },
    { label: 'Entreprises', icon: '🏢', route: '/companies', roles: ['admin'] },
    { label: 'Offres', icon: '💼', route: '/offers', roles: ['admin', 'student', 'company'] },
    { label: 'Candidatures', icon: '📄', route: '/applications', roles: ['admin', 'student', 'company'] },
    { label: 'Mon profil', icon: '👤', route: '/profile', roles: ['student', 'company'] }
  ];

  constructor(public authService: AuthService) {}

  get visibleItems(): NavItem[] {
    return this.navItems.filter(item => this.authService.hasRole(item.roles));
  }

  get user(): any {
    return this.authService.getUser();
  }

  get initials(): string {
    const u = this.user;
    if (!u) return '?';
    return `${(u.firstName || '?')[0]}${(u.lastName || '')[0] || ''}`.toUpperCase();
  }
}
