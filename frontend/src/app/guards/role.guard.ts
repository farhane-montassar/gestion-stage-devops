import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protège une route selon les rôles autorisés définis dans `data.roles`.
 * - Non connecté        -> redirection vers /login
 * - Connecté sans droit -> redirection vers /dashboard
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data?.['roles'] as string[]) ?? [];

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.hasRole(allowedRoles)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
