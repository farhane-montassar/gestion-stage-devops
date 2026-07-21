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

export interface Company {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  sector: string;
  logo?: FileMeta;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private apiUrl = `${environment.apiUrl}/companies`;

  constructor(private http: HttpClient) {}

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(this.apiUrl);
  }

  createCompany(company: Company): Observable<any> {
    return this.http.post(this.apiUrl, company);
  }

  updateCompany(id: string, company: Company): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, company);
  }

  deleteCompany(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Profil de l'entreprise connectée (créé/lié automatiquement côté backend).
  getMyCompany(): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/me`);
  }

  // ---- Logo de l'entreprise connectée ----
  // Pas de Content-Type manuel : le navigateur gère la boundary multipart.
  uploadLogo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post(`${this.apiUrl}/me/logo`, formData);
  }

  deleteLogo(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/me/logo`);
  }
}