import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FileMeta {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface Student {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  level: string;
  domain: string;
  skills?: string[];
  cv?: FileMeta;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = `${environment.apiUrl}/students`;

  constructor(private http: HttpClient) {}

  getStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(this.apiUrl);
  }

  // Profil de l'étudiant connecté (créé/lié automatiquement côté backend)
  getMyStudent(): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/me`);
  }

  createStudent(student: Student): Observable<any> {
    return this.http.post(this.apiUrl, student);
  }

  updateStudent(id: string, student: Student): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, student);
  }

  deleteStudent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // ---- CV de l'étudiant connecté ----
  // On n'impose PAS de Content-Type : le navigateur génère la boundary multipart.
  uploadCv(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('cv', file);
    return this.http.post(`${this.apiUrl}/me/cv`, formData);
  }

  deleteCv(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/me/cv`);
  }
}