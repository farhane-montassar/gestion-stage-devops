# Monitoring — Gestion de Stages

Phase monitoring : exposition de métriques applicatives (Prometheus) et
visualisation (Grafana), sans modification de la logique métier.

```
Navigateur ──► Grafana (3001) ──► Prometheus (9090) ──scrape──► Backend (5000) /metrics
                                                                Backend (5000) /health ◄── Render health check
```

---

## 1. Endpoints exposés par le backend

| Endpoint      | Rôle                                    | Réponse                          |
| ------------- | --------------------------------------- | -------------------------------- |
| `GET /health` | Sonde de santé (orchestrateur / Render) | `200` si MongoDB connecté, `503` sinon |
| `GET /metrics`| Métriques au format exposition Prometheus | `200`, `text/plain; version=0.0.4` |
| `GET /api/health` | Ancienne sonde, **conservée** pour rétro-compatibilité | `200` constant |

### `GET /health`

État sain (MongoDB connecté) → **HTTP 200** :

```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 9.813,
  "timestamp": "2026-07-30T22:15:37.648Z",
  "version": "1.0.0"
}
```

MongoDB indisponible → **HTTP 503** :

```json
{
  "status": "unavailable",
  "database": "connecting",
  "uptime": 0.586,
  "timestamp": "2026-07-30T22:12:51.829Z",
  "version": "1.0.0"
}
```

- `database` reflète `mongoose.connection.readyState` :
  `disconnected` | `connected` | `connecting` | `disconnecting`.
- `version` est lue depuis `backend/package.json` au démarrage.
- La réponse porte `Cache-Control: no-store` : ni Render ni Nginx ne
  doivent servir une sonde depuis un cache.

> **À savoir** — `config/db.js` fait `process.exit(1)` si la connexion
> **initiale** échoue. Le code 503 couvre donc surtout une déconnexion
> **en cours de vie** du process. En cas d'échec au démarrage, le process
> meurt et Render marque le déploiement comme non sain. Ce comportement
> existant n'a volontairement pas été modifié.

---

## 2. Métriques Prometheus

Registre dédié, préfixe `gestion_stage_` (`backend/config/metrics.js`) :

| Métrique | Type | Labels |
| -------- | ---- | ------ |
| `gestion_stage_<défauts Node.js>` | divers | — |
| `gestion_stage_http_requests_total` | Counter | `method`, `route`, `status_code` |
| `gestion_stage_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` |

- **Métriques Node.js par défaut** (~82 séries) : CPU, mémoire heap,
  event loop lag, handles ouverts, GC — via `collectDefaultMetrics`.
- **Histogramme** : buckets `0.05, 0.1, 0.3, 0.5, 1, 2, 5` secondes.

### Label `route` — cardinalité maîtrisée

Le middleware n'utilise **jamais** l'URL brute. Il émet le *motif* de route
déclaré par Express :

```
PUT /api/offers/507f1f77bcf86cd799439011  ─┐
PUT /api/offers/507f191e810c19729de860ea  ─┼─► route="/api/offers/:id"  (1 série)
PUT /api/offers/aaaaaaaaaaaaaaaaaaaaaaaa  ─┘
```

Sans cela, chaque identifiant MongoDB créerait une série temporelle
distincte et saturerait Prometheus. Cas particuliers :

- middleware monté sans route déclarée (ex. `express.static`) → `"/uploads/*"` ;
- aucune route matchée (404) → `"unmatched"` (un scan d'URLs ne peut
  donc pas générer des milliers de séries).

### Ordre d'enregistrement

Dans `backend/app.js`, `app.use(metricsMiddleware)` est placé **avant
toutes les routes** (juste après CORS et les parsers), donc chaque requête
est instrumentée — y compris les 404 et les erreurs. Les compteurs sont
renseignés sur l'évènement `res.on("finish")`, c'est-à-dire une fois la
réponse réellement écrite.

---

## 3. Lancement local (Docker Compose)

```bash
docker compose up -d --build
docker compose ps
```

| Service    | URL locale              | Identifiants        |
| ---------- | ----------------------- | ------------------- |
| Backend    | http://localhost:5000   | —                   |
| Frontend   | http://localhost:4200   | —                   |
| Nginx      | http://localhost:8080   | —                   |
| Prometheus | http://localhost:9090   | —                   |
| Grafana    | http://localhost:3001   | `admin` / `admin`   |

Les identifiants Grafana sont surchargeables depuis le `.env` racine :

```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=un_mot_de_passe_solide
```

### Grafana : source de données auto-provisionnée

`monitoring/grafana/provisioning/datasources/datasource.yml` est monté dans
`/etc/grafana/provisioning`. Au démarrage, Grafana crée automatiquement la
source **Prometheus** (`http://prometheus:9090`) et la marque **par défaut** —
aucune configuration manuelle dans l'interface.

> `access: proxy` signifie que c'est le *serveur* Grafana qui interroge
> Prometheus. L'URL est donc résolue **dans le réseau Docker**
> (`prometheus:9090`), pas depuis le navigateur — ne pas y mettre
> `localhost:9090`.

---

## 4. Procédure de test

### 4.1 Backend seul (sans Docker)

```bash
cd backend
npm install
npm start
```

```bash
# 200 + status/database/uptime/timestamp/version
curl -i http://localhost:5000/health

# 200 + text/plain; version=0.0.4
curl -i http://localhost:5000/metrics

# métriques Node.js par défaut présentes
curl -s http://localhost:5000/metrics | grep -c "^gestion_stage_process_"

# compteur et histogramme HTTP
curl -s http://localhost:5000/metrics | grep "^gestion_stage_http_requests_total{"
curl -s http://localhost:5000/metrics | grep "^gestion_stage_http_request_duration_seconds_count{"
```

Tester le **503** : lancer le backend avec une base injoignable.

```bash
MONGO_URI="mongodb://127.0.0.1:59999/nodb" PORT=5055 node app.js
curl -i http://localhost:5055/health      # -> HTTP/1.1 503
```

### 4.2 Stack complète

| # | À tester | Attendu |
| - | -------- | ------- |
| 1 | http://localhost:5000/health | `200`, `"database": "connected"` |
| 2 | http://localhost:5000/metrics | `200`, texte `gestion_stage_*` |
| 3 | http://localhost:9090 | UI Prometheus |
| 4 | http://localhost:9090/targets | cible `gestion-stage-backend` **UP** |
| 5 | http://localhost:3001 | Grafana (admin/admin) |
| 6 | Grafana → Connections → Data sources | **Prometheus** présent, badge *default* |
| 7 | Grafana → Explore → `gestion_stage_http_requests_total` | courbes affichées |

Requête PromQL utile dans Prometheus ou Grafana Explore :

```promql
# Débit de requêtes par route
rate(gestion_stage_http_requests_total[5m])

# Latence p95
histogram_quantile(0.95, rate(gestion_stage_http_request_duration_seconds_bucket[5m]))

# Taux d'erreurs 5xx
rate(gestion_stage_http_requests_total{status_code=~"5.."}[5m])
```

### 4.3 Backend déployé sur Render

```bash
curl -i https://<votre-backend>.onrender.com/health
curl -s https://<votre-backend>.onrender.com/metrics | head -20
```

> Sur une offre gratuite Render, le service se met en veille. Le premier
> appel peut prendre ~30 s (cold start) et `/health` peut répondre `503`
> le temps que MongoDB se reconnecte.

---

## 5. Configuration Render

### 5.1 Health Check Path

Dashboard Render → service backend → **Settings** → **Health & Alerts** →
**Health Check Path** :

```
/health
```

Render appelle cet endpoint périodiquement. Un `503` (MongoDB déconnecté)
empêche la promotion d'un déploiement et déclenche un redémarrage — c'est
exactement le comportement voulu.

### 5.2 Accès à `/metrics`

`/metrics` est exposé publiquement sur l'URL du service :

```
https://<votre-backend>.onrender.com/metrics
```

Aucune variable d'environnement n'est nécessaire : `prom-client` est une
dépendance de production (`backend/package.json`) et le registre est
initialisé au chargement de `config/metrics.js`.

Pour scraper ce backend depuis un Prometheus local, décommenter le job
`gestion-stage-backend-render` dans `monitoring/prometheus.yml` et y
renseigner votre nom d'hôte Render (sans `https://`, sans slash final).

> **Sécurité** — l'endpoint est public et ne contient aucune donnée
> personnelle (uniquement des compteurs techniques et des motifs de route,
> jamais d'identifiants). Il révèle toutefois la topologie des routes et la
> charge du service. Pour le restreindre, placer un jeton en en-tête et
> configurer `authorization` côté Prometheus — non mis en place ici pour ne
> pas casser le scraping local.

### 5.3 Variables d'environnement

Le monitoring n'en ajoute **aucune** côté Render. Les variables existantes
restent inchangées :

| Variable | Usage |
| -------- | ----- |
| `PORT` | fourni par Render |
| `MONGO_URI` | MongoDB Atlas |
| `JWT_SECRET` | authentification |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | uploads |

`GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` ne concernent que le
`docker-compose` **local** (Grafana et Prometheus ne sont pas déployés sur
Render dans cette phase).

---

## 6. Prometheus / Grafana ne se téléchargent pas (TLS, réseau, proxy)

Symptômes typiques de `docker compose up` :

```
failed to resolve reference "docker.io/prom/prometheus:latest"
tls: failed to verify certificate: x509: certificate signed by unknown authority
net/http: TLS handshake timeout
```

**C'est un problème d'infrastructure, pas d'application.** Le code du
projet est correct ; c'est le *pull* d'images depuis Docker Hub qui échoue
(proxy d'entreprise, inspection TLS, pare-feu, DNS, ou Docker Desktop non
démarré).

Pistes de résolution :

1. Vérifier que Docker Desktop est démarré : `docker version`.
2. Tester le réseau : `docker pull hello-world`.
3. Derrière un proxy d'entreprise : renseigner le proxy HTTP/HTTPS dans
   Docker Desktop → *Settings* → *Resources* → *Proxies*.
4. Inspection TLS : ajouter le certificat racine de l'entreprise aux
   certificats de confiance de Docker Desktop.
5. Épingler des versions au lieu de `latest`
   (ex. `prom/prometheus:v2.54.1`, `grafana/grafana:11.2.0`) si seul le
   tag mobile est bloqué.

**Impact sur le projet : nul côté application.** Prometheus et Grafana ne
sont que des *consommateurs* des métriques. Même si aucun des deux ne
démarre :

- le backend démarre normalement ;
- `GET /health` et `GET /metrics` restent pleinement fonctionnels ;
- le déploiement Render n'est pas affecté (il ne construit que le backend
  et le frontend, jamais les images de monitoring) ;
- le health check Render `/health` continue de fonctionner.

Les métriques restent consultables sans Prometheus :

```bash
curl -s http://localhost:5000/metrics
```

---

## 7. Fichiers du monitoring

```
backend/
  app.js                              # /health enrichi, /metrics, middleware monté avant les routes
  config/metrics.js                   # registre + compteur + histogramme
  middleware/metrics.middleware.js    # instrumentation, label route à cardinalité maîtrisée
monitoring/
  prometheus.yml                      # scrape backend:5000 + auto-scrape + job Render optionnel
  grafana/provisioning/datasources/
    datasource.yml                    # Prometheus en source par défaut
docker-compose.yml                    # services prometheus + grafana, volumes persistants
```
