import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompanyService, Company } from '../../services/company.service';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css'
})
export class CompaniesComponent implements OnInit {
  companies: Company[] = [];
  filteredCompanies: Company[] = [];

  companyForm: FormGroup;
  isEditMode = false;
  selectedCompanyId: string | null = null;

  constructor(
    private companyService: CompanyService,
    private fb: FormBuilder
  ) {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      sector: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.companyService.getCompanies().subscribe({
      next: (data) => {
        this.companies = data;
        this.filteredCompanies = data;
      },
      error: (err) => console.error(err)
    });
  }

  saveCompany(): void {
    if (this.companyForm.invalid) return;

    if (this.isEditMode && this.selectedCompanyId) {
      this.companyService.updateCompany(this.selectedCompanyId, this.companyForm.value).subscribe({
        next: () => {
          this.resetForm();
          this.loadCompanies();
        }
      });
    } else {
      this.companyService.createCompany(this.companyForm.value).subscribe({
        next: () => {
          this.resetForm();
          this.loadCompanies();
        }
      });
    }
  }

  editCompany(company: Company): void {
    this.isEditMode = true;
    this.selectedCompanyId = company._id || null;
    this.companyForm.patchValue(company);
  }

  deleteCompany(id?: string): void {
    if (!id) return;

    if (confirm('Voulez-vous vraiment supprimer cette entreprise ?')) {
      this.companyService.deleteCompany(id).subscribe({
        next: () => this.loadCompanies()
      });
    }
  }

  searchCompanies(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();

    this.filteredCompanies = this.companies.filter(company =>
      company.name.toLowerCase().includes(value) ||
      company.email.toLowerCase().includes(value) ||
      company.phone.toLowerCase().includes(value) ||
      company.address.toLowerCase().includes(value) ||
      company.sector.toLowerCase().includes(value)
    );
  }

  resetForm(): void {
    this.companyForm.reset();
    this.isEditMode = false;
    this.selectedCompanyId = null;
  }
}