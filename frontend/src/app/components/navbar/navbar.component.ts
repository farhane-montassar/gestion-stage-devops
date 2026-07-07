import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  NotificationService,
  AppNotification
} from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  notifications: AppNotification[] = [];
  unreadCount = 0;
  showDropdown = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  get user(): any {
    return this.authService.getUser();
  }

  get roleLabel(): string {
    switch (this.authService.getRole()) {
      case 'admin':
        return 'Administrateur';
      case 'student':
        return 'Étudiant';
      case 'company':
        return 'Entreprise';
      default:
        return '';
    }
  }

  ngOnInit(): void {
    // Chargement uniquement côté navigateur (SSR-safe) et si connecté
    if (isPlatformBrowser(this.platformId) && this.authService.isLoggedIn()) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.notificationService.getMyNotifications().subscribe({
      next: (res) => {
        this.notifications = res.notifications;
        this.unreadCount = res.unreadCount;
      },
      error: (err) => console.error('Notifications:', err)
    });
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.loadNotifications();
    }
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  markAsRead(notification: AppNotification): void {
    if (!notification._id || notification.read) return;

    this.notificationService.markAsRead(notification._id).subscribe({
      next: () => {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: (err) => console.error(err)
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => (n.read = true));
        this.unreadCount = 0;
      },
      error: (err) => console.error(err)
    });
  }

  // Icône selon le type de notification
  iconFor(type: string): string {
    switch (type) {
      case 'application':
        return '📄';
      case 'accepted':
        return '✅';
      case 'refused':
        return '❌';
      case 'offer':
        return '💼';
      default:
        return '🔔';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
