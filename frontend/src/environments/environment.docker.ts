// =============================================================
//  Environnement DOCKER (reverse proxy Nginx)
//  Utilisé uniquement par le build local docker-compose
//  via la configuration Angular "docker" (voir angular.json).
//
//  apiUrl est RELATIF : le navigateur appelle la même origine
//  que la page (Nginx), qui redirige ensuite /api/* vers le backend.
//  => le frontend n'a plus besoin de connaître l'adresse du backend.
// =============================================================
export const environment = {
  production: true,
  apiUrl: '/api'
};
