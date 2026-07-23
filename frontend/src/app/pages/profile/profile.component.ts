import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { StudentService, Student } from '../../services/student.service';
import { CompanyService, Company } from '../../services/company.service';
import { buildFileUrl } from '../../services/file-url.util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  role: string | null = null;

  student: Student | null = null;
  company: Company | null = null;

  // États d'interface
  loading = false;      // chargement du profil
  uploading = false;    // upload/suppression en cours
  error = '';
  success = '';

  // Contraintes (miroir du backend, pour un feedback immédiat)
  private readonly CV_MAX = 5 * 1024 * 1024;
  private readonly LOGO_MAX = 2 * 1024 * 1024;
  private readonly LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(
    private authService: AuthService,
    private studentService: StudentService,
    private companyService: CompanyService
  ) {}

  get isStudent(): boolean {
    return this.role === 'student';
  }

  get isCompany(): boolean {
    return this.role === 'company';
  }

  ngOnInit(): void {
    this.role = this.authService.getRole();
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.error = '';

    if (this.isStudent) {
      this.studentService.getMyStudent().subscribe({
        next: (data) => {
          this.student = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Impossible de charger le profil.';
          this.loading = false;
        }
      });
    } else if (this.isCompany) {
      this.companyService.getMyCompany().subscribe({
        next: (data) => {
          this.company = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Impossible de charger le profil.';
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  // URL complète d'un fichier (adaptée à l'environnement)
  fileUrl(url?: string | null): string {
    return buildFileUrl(url);
  }

  // ----------------------- CV (étudiant) -----------------------
  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.resetMessages();

    if (file.type !== 'application/pdf') {
      this.error = 'Le CV doit être un fichier PDF.';
      input.value = '';
      return;
    }
    if (file.size > this.CV_MAX) {
      this.error = 'Le CV ne doit pas dépasser 5 Mo.';
      input.value = '';
      return;
    }

    this.uploading = true;
    this.studentService.uploadCv(file).subscribe({
      next: (res) => {
        if (this.student) this.student.cv = res.cv;
        this.success = 'CV téléversé avec succès.';
        this.uploading = false;
        input.value = '';
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec du téléversement du CV.';
        this.uploading = false;
        input.value = '';
      }
    });
  }

  deleteCv(): void {
    this.resetMessages();
    this.uploading = true;
    this.studentService.deleteCv().subscribe({
      next: () => {
        if (this.student) this.student.cv = undefined;
        this.success = 'CV supprimé.';
        this.uploading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec de la suppression.';
        this.uploading = false;
      }
    });
  }

  // ----------------------- Logo (entreprise) -----------------------
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.resetMessages();

    if (!this.LOGO_TYPES.includes(file.type)) {
      this.error = 'Le logo doit être une image JPG, PNG ou WebP.';
      input.value = '';
      return;
    }
    if (file.size > this.LOGO_MAX) {
      this.error = 'Le logo ne doit pas dépasser 2 Mo.';
      input.value = '';
      return;
    }

    this.uploading = true;
    this.companyService.uploadLogo(file).subscribe({
      next: (res) => {
        if (this.company) this.company.logo = res.logo;
        this.success = 'Logo téléversé avec succès.';
        this.uploading = false;
        input.value = '';
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec du téléversement du logo.';
        this.uploading = false;
        input.value = '';
      }
    });
  }

  deleteLogo(): void {
    this.resetMessages();
    this.uploading = true;
    this.companyService.deleteLogo().subscribe({
      next: () => {
        if (this.company) this.company.logo = undefined;
        this.success = 'Logo supprimé.';
        this.uploading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec de la suppression.';
        this.uploading = false;
      }
    });
  }

  private resetMessages(): void {
    this.error = '';
    this.success = '';
  }
}
