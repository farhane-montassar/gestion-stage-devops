import { environment } from '../../environments/environment';

/**
 * Construit l'URL complète d'un fichier téléversé.
 *
 *  - URLs Cloudinary (nouveaux uploads) : ce sont des URLs ABSOLUES
 *    (https://res.cloudinary.com/...) => renvoyées TELLES QUELLES, on ne
 *    préfixe JAMAIS l'URL du backend.
 *
 *  - Anciennes URLs locales relatives (ex: "/uploads/cv/xxx.pdf") — rétro-compat :
 *      * En LOCAL derrière Nginx (apiUrl = "/api") => renvoyée telle quelle
 *        (même origine, Nginx route /uploads).
 *      * En PROD (apiUrl = "https://backend.onrender.com/api") => on dérive
 *        l'origine du backend (en retirant "/api") et on la préfixe.
 *
 * Ne jamais coder l'URL en dur : elle s'adapte automatiquement.
 */
export function buildFileUrl(relativeUrl?: string | null): string {
  if (!relativeUrl) {
    return '';
  }

  // Déjà une URL absolue -> on ne touche à rien.
  if (/^https?:\/\//i.test(relativeUrl)) {
    return relativeUrl;
  }

  const api = environment.apiUrl;

  // apiUrl absolu (prod) : on retire "/api" final pour obtenir l'origine backend.
  if (/^https?:\/\//i.test(api)) {
    const origin = api.replace(/\/api\/?$/, '');
    return `${origin}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
  }

  // apiUrl relatif (local/Nginx) : même origine que la page.
  return relativeUrl;
}
