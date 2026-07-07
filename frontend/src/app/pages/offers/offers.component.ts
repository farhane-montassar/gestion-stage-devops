import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { OfferService, Offer } from '../../services/offer.service';
import { CompanyService, Company } from '../../services/company.service';
import { StudentService, Student } from '../../services/student.service';
import { AuthService } from '../../services/auth.service';
import { MatchingService, MatchResult } from '../../services/matching.service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.css'
})
export class OffersComponent implements OnInit {
  offers: Offer[] = [];
  filteredOffers: Offer[] = [];
  companies: Company[] = [];

  role: string | null = null;

  // Smart matching (rôle student)
  myStudent: Student | null = null;
  matchMap: { [offerId: string]: MatchResult } = {};

  offerForm: FormGroup;
  isEditMode = false;
  selectedOfferId: string | null = null;

  constructor(
    private offerService: OfferService,
    private companyService: CompanyService,
    private studentService: StudentService,
    private authService: AuthService,
    private matchingService: MatchingService,
    private fb: FormBuilder
  ) {
    this.offerForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      company: ['', Validators.required],
      location: ['', Validators.required],
      duration: ['', Validators.required],
      level: ['', Validators.required],
      domain: ['', Validators.required],
      requiredSkills: [''],
      status: ['Open']
    });
  }

  // Seul l'admin gère les offres (le dropdown entreprises = GET /companies, réservé admin).
  get canManage(): boolean {
    return this.role === 'admin';
  }

  get isStudent(): boolean {
    return this.role === 'student';
  }

  ngOnInit(): void {
    this.role = this.authService.getRole();

    this.loadOffers();

    if (this.canManage) {
      this.loadCompanies();
    }

    if (this.isStudent) {
      this.loadMyStudentProfile();
    }
  }

  loadOffers(): void {
    this.offerService.getOffers().subscribe({
      next: (data) => {
        this.offers = data;
        this.filteredOffers = data;
        this.applyMatching();
      },
      error: (err) => console.error('Offres:', err)
    });
  }

  loadCompanies(): void {
    this.companyService.getCompanies().subscribe({
      next: (data) => {
        this.companies = data;
      },
      error: (err) => console.error('Entreprises:', err)
    });
  }

  loadMyStudentProfile(): void {
    this.studentService.getMyStudent().subscribe({
      next: (student) => {
        this.myStudent = student;
        this.applyMatching();
      },
      error: (err) => console.error('Profil étudiant:', err)
    });
  }

  /**
   * Calcule le score de chaque offre pour l'étudiant connecté,
   * puis trie les offres du meilleur au moins bon score.
   */
  applyMatching(): void {
    if (!this.isStudent || !this.myStudent) {
      return;
    }

    this.matchMap = {};
    for (const offer of this.offers) {
      if (offer._id) {
        this.matchMap[offer._id] = this.matchingService.computeMatch(this.myStudent, offer);
      }
    }

    this.filteredOffers = this.sortByScore(this.filteredOffers);
  }

  getMatch(offer: Offer): MatchResult | null {
    return offer._id ? this.matchMap[offer._id] || null : null;
  }

  private sortByScore(list: Offer[]): Offer[] {
    return [...list].sort(
      (a, b) => (this.getMatch(b)?.score || 0) - (this.getMatch(a)?.score || 0)
    );
  }

  saveOffer(): void {
    if (this.offerForm.invalid) return;

    const raw = this.offerForm.value;
    const payload: Offer = {
      ...raw,
      requiredSkills: this.parseSkills(raw.requiredSkills)
    };

    if (this.isEditMode && this.selectedOfferId) {
      this.offerService.updateOffer(this.selectedOfferId, payload).subscribe({
        next: () => {
          this.resetForm();
          this.loadOffers();
        },
        error: (err) => console.error(err)
      });
    } else {
      this.offerService.createOffer(payload).subscribe({
        next: () => {
          this.resetForm();
          this.loadOffers();
        },
        error: (err) => console.error(err)
      });
    }
  }

  editOffer(offer: Offer): void {
    this.isEditMode = true;
    this.selectedOfferId = offer._id || null;

    this.offerForm.patchValue({
      title: offer.title,
      description: offer.description,
      company: offer.company?._id || offer.company,
      location: offer.location,
      duration: offer.duration,
      level: offer.level,
      domain: offer.domain,
      requiredSkills: (offer.requiredSkills || []).join(', '),
      status: offer.status
    });
  }

  deleteOffer(id?: string): void {
    if (!id) return;

    if (confirm('Voulez-vous vraiment supprimer cette offre ?')) {
      this.offerService.deleteOffer(id).subscribe({
        next: () => this.loadOffers(),
        error: (err) => console.error(err)
      });
    }
  }

  searchOffers(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();

    const filtered = this.offers.filter(
      (offer) =>
        offer.title.toLowerCase().includes(value) ||
        offer.description.toLowerCase().includes(value) ||
        (offer.domain || '').toLowerCase().includes(value) ||
        (offer.level || '').toLowerCase().includes(value) ||
        (offer.location || '').toLowerCase().includes(value) ||
        (offer.company?.name || '').toLowerCase().includes(value) ||
        (offer.requiredSkills || []).join(' ').toLowerCase().includes(value)
    );

    // On conserve le tri par score pour l'étudiant
    this.filteredOffers = this.isStudent ? this.sortByScore(filtered) : filtered;
  }

  resetForm(): void {
    this.offerForm.reset({
      status: 'Open'
    });
    this.isEditMode = false;
    this.selectedOfferId = null;
  }

  private parseSkills(value: string): string[] {
    return (value || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
