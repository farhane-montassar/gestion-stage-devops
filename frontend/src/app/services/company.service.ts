import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Company {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  sector: string;
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
}