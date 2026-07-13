import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  saveToken(token: string): void {
    if (this.isBrowser()) {
      localStorage.setItem('token', token);
    }
  }

  saveUser(user: any): void {
    if (this.isBrowser()) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  getToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem('token');
    }
    return null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  getUser(): any {
  if (this.isBrowser()) {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  return null;
}

getRole(): string | null {
  const user = this.getUser();
  return user ? user.role : null;
}

hasRole(roles: string[]): boolean {
  const role = this.getRole();
  return role ? roles.includes(role) : false;
}
}