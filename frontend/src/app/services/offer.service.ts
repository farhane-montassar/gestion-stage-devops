import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Offer {
  _id?: string;
  title: string;
  description: string;
  company: any;
  location?: string;
  duration?: string;
  level?: string;
  domain?: string;
  requiredSkills?: string[];
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfferService {
  private apiUrl = `${environment.apiUrl}/offers`;

  constructor(private http: HttpClient) {}

  getOffers(): Observable<Offer[]> {
    return this.http.get<Offer[]>(this.apiUrl);
  }

  createOffer(offer: Offer): Observable<any> {
    return this.http.post(this.apiUrl, offer);
  }

  updateOffer(id: string, offer: Offer): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, offer);
  }

  deleteOffer(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}