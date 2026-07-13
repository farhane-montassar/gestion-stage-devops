import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppNotification {
  _id?: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt?: string;
}

export interface NotificationResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(this.apiUrl);
  }

  markAsRead(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {});
  }
}
