import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ApplicationService, Application } from '../../services/application.service';
import { StudentService, Student } from '../../services/student.service';
import { OfferService, Offer } from '../../services/offer.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.css'
})
export class ApplicationsComponent implements OnInit {
  applications: Application[] = [];
  filteredApplications: Application[] = [];
  offers: Offer[] = [];

  myStudent: Student | null = null;
  role: string | null = null;
  errorMessage = '';

  applicationForm: FormGroup;

  constructor(
    private applicationService: ApplicationService,
    private studentService: StudentService,
    private offerService: OfferService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.applicationForm = this.fb.group({
      offer: ['', Validators.required],
      motivation: ['', Validators.required]
    });
  }

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
    this.role = this.authService.getRole();

    this.loadOffers();
    this.loadApplications();

    // Le profil étudiant n'est chargé que pour le rôle student (GET /students/me)
    if (this.isStudent) {
      this.loadMyStudentProfile();
    }
  }

  loadMyStudentProfile(): void {
    this.studentService.getMyStudent().subscribe({
      next: (student) => (this.myStudent = student),
      error: (err) => console.error('Profil étudiant:', err)
    });
  }

  loadApplications(): void {
    this.applicationService.getApplications().subscribe({
      next: (data) => {
        // Un student ne voit que ses propres candidatures
        this.applications = this.isStudent
          ? data.filter((a) => a.student?.email === this.authService.getUser()?.email)
          : data;
        this.filteredApplications = this.applications;
      },
      error: (err) => console.error('Candidatures:', err)
    });
  }

  loadOffers(): void {
    this.offerService.getOffers().subscribe({
      next: (data) => (this.offers = data),
      error: (err) => console.error('Offres:', err)
    });
  }

  saveApplication(): void {
    this.errorMessage = '';

    if (this.applicationForm.invalid) {
      return;
    }

    if (!this.myStudent?._id) {
      this.errorMessage = 'Profil étudiant introuvable. Impossible de postuler.';
      return;
    }

    const payload = {
      student: this.myStudent._id,
      offer: this.applicationForm.value.offer,
      motivation: this.applicationForm.value.motivation
    };

    this.applicationService.createApplication(payload as any).subscribe({
      next: () => {
        this.applicationForm.reset();
        this.loadApplications();
      },
      error: (err) => {
        this.errorMessage = "Erreur lors de l'envoi de la candidature.";
        console.error(err);
      }
    });
  }

  changeStatus(id: string | undefined, status: string): void {
    if (!id) return;

    this.applicationService.updateApplicationStatus(id, status).subscribe({
      next: () => this.loadApplications(),
      error: (err) => console.error(err)
    });
  }

  deleteApplication(id?: string): void {
    if (!id) return;

    if (confirm('Voulez-vous vraiment supprimer cette candidature ?')) {
      this.applicationService.deleteApplication(id).subscribe({
        next: () => this.loadApplications(),
        error: (err) => console.error(err)
      });
    }
  }

  searchApplications(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();

    this.filteredApplications = this.applications.filter(
      (app) =>
        (app.student?.firstName || '').toLowerCase().includes(value) ||
        (app.student?.lastName || '').toLowerCase().includes(value) ||
        (app.offer?.title || '').toLowerCase().includes(value) ||
        (app.offer?.company?.name || '').toLowerCase().includes(value) ||
        (app.status || '').toLowerCase().includes(value)
    );
  }
}
