import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RegisterPayload } from '../../services/auth.service';

type AuthMode = 'login' | 'signup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  mode: AuthMode = 'login';

  loginForm: FormGroup;
  signupForm: FormGroup;

  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.signupForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
        role: ['student', [Validators.required]]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  switchMode(mode: AuthMode): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  selectRole(role: 'student' | 'company'): void {
    this.signupForm.get('role')?.setValue(role);
  }

  onLogin(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.loginForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement.';
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.token) {
          this.authService.saveToken(res.token);
        }
        this.authService.saveUser(res.user);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.resolveError(err, 'Email ou mot de passe incorrect.');
      }
    });
  }

  onSignup(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.signupForm.hasError('passwordMismatch')) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (this.signupForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement (mot de passe : 8 caractères minimum).';
      return;
    }

    const value = this.signupForm.value;
    const payload: RegisterPayload = {
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email,
      password: value.password,
      role: value.role
    };

    this.loading = true;
    this.authService.register(payload).subscribe({
      next: (res) => {
        this.loading = false;

        // Connexion automatique si le backend retourne un token
        if (res.token) {
          this.authService.saveToken(res.token);
          this.authService.saveUser(res.user);
          this.router.navigate(['/dashboard']);
          return;
        }

        // Sinon, bascule vers le mode connexion avec email pré-rempli
        this.successMessage = 'Compte créé avec succès. Vous pouvez vous connecter.';
        this.loginForm.patchValue({ email: payload.email });
        this.mode = 'login';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.resolveError(err, "Impossible de créer le compte.");
      }
    });
  }

  private resolveError(err: any, fallback: string): string {
    if (err?.status === 0) {
      return 'Serveur indisponible. Vérifiez votre connexion réseau.';
    }
    return err?.error?.message || fallback;
  }
}
