import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { StudentService } from '../../services/student.service';
import { CompanyService } from '../../services/company.service';
import { OfferService } from '../../services/offer.service';
import { ApplicationService } from '../../services/application.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  totalStudents = 0;
  totalCompanies = 0;
  totalOffers = 0;
  totalApplications = 0;

  user: any = null;
  role: string | null = null;
  latestOffers: any[] = [];

  constructor(
    private authService: AuthService,
    private studentService: StudentService,
    private companyService: CompanyService,
    private offerService: OfferService,
    private applicationService: ApplicationService
  ) {}

  get isAdmin(): boolean {
    return this.role === 'admin';
  }

  get isStudent(): boolean {
    return this.role === 'student';
  }

  get isCompany(): boolean {
    return this.role === 'company';
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.role = this.authService.getRole();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // Offres : accessibles à tous les rôles connectés
    this.offerService.getOffers().subscribe({
      next: (data) => {
        this.totalOffers = data.length;
        this.latestOffers = data.slice(0, 3);
      },
      error: (err) => console.error('Offres:', err)
    });

    // Étudiants + entreprises : réservés à l'admin (évite les 403)
    if (this.isAdmin) {
      this.studentService.getStudents().subscribe({
        next: (data) => (this.totalStudents = data.length),
        error: (err) => console.error('Étudiants:', err)
      });

      this.companyService.getCompanies().subscribe({
        next: (data) => (this.totalCompanies = data.length),
        error: (err) => console.error('Entreprises:', err)
      });
    }

    // Candidatures : admin, company, student (le student ne voit que les siennes)
    this.applicationService.getApplications().subscribe({
      next: (data) => {
        if (this.isStudent) {
          const myEmail = this.user?.email;
          this.totalApplications = data.filter(
            (a) => a.student?.email === myEmail
          ).length;
        } else {
          this.totalApplications = data.length;
        }
      },
      error: (err) => console.error('Candidatures:', err)
    });
  }
}
