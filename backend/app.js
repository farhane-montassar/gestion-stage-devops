const dns = require("node:dns");

// DNS Google + Cloudflare (évite les erreurs querySrv sous Windows)
dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const connectDB = require("./config/db");
// Racine des anciens uploads locaux : sert encore les fichiers déjà présents
// avant la migration vers Cloudinary (rétro-compat des URLs /uploads/...).
const { UPLOAD_ROOT } = require("./middleware/upload.middleware");
// Configure Cloudinary au démarrage (lecture des variables d'environnement).
const { isCloudinaryConfigured } = require("./config/cloudinary");
// Monitoring : collecte des métriques HTTP + registre Prometheus.
const metricsMiddleware = require("./middleware/metrics.middleware");
const { register } = require("./config/metrics");
// Version applicative exposée par /health : lue une seule fois au démarrage
// depuis package.json (présent dans l'image Docker via COPY . .).
const { version: APP_VERSION } = require("./package.json");

const app = express();

// =========================
// Middlewares
// =========================
const allowedOrigins = [
  "http://localhost:4200",
  // Origines derrière le reverse proxy Nginx (docker-compose local)
  "http://localhost",
  "http://localhost:8080",
  "https://gestion-stage-frontend.onrender.com"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Autorise les outils sans origin (curl, Postman, health checks) et les origines connues
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origine non autorisée par CORS"));
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Monitoring
// Enregistré AVANT toutes les routes API pour instrumenter chaque requête
// (compteur + histogramme de durée renseignés sur l'évènement "finish").
// =========================
app.use(metricsMiddleware);

// =========================
// Connexion MongoDB
// =========================
connectDB();

// Avertit si les identifiants Cloudinary manquent (les uploads échoueraient).
if (!isCloudinaryConfigured()) {
  console.warn(
    "⚠️  Cloudinary non configuré : définissez CLOUDINARY_CLOUD_NAME, " +
      "CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET pour activer les uploads."
  );
}

// =========================
// Health Check (Render)
// =========================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Gestion Stage API is running",
    timestamp: new Date().toISOString()
  });
});

// =========================
// Health Check applicatif (monitoring / orchestrateur)
//  - 200 si MongoDB est connecté ;
//  - 503 sinon (l'orchestrateur peut retirer l'instance du pool).
// =========================
const MONGO_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

app.get("/health", (req, res) => {
  const readyState = mongoose.connection.readyState;
  const isDatabaseConnected = readyState === 1;

  // Un health check ne doit jamais être servi depuis un cache
  // (proxy Render / Nginx) : la réponse doit refléter l'état courant.
  res.set("Cache-Control", "no-store");

  res.status(isDatabaseConnected ? 200 : 503).json({
    status: isDatabaseConnected ? "ok" : "unavailable",
    database: MONGO_STATES[readyState] || "unknown",
    // Secondes écoulées depuis le démarrage du process (arrondi 3 décimales).
    uptime: Number(process.uptime().toFixed(3)),
    timestamp: new Date().toISOString(),
    version: APP_VERSION
  });
});

// =========================
// Métriques Prometheus (format texte exposition)
// register.metrics() est asynchrone : les erreurs sont déléguées au
// gestionnaire d'erreurs global via next(err).
// =========================
app.get("/metrics", async (req, res, next) => {
  try {
    const metrics = await register.metrics();

    res.set("Content-Type", register.contentType);
    res.status(200).send(metrics);
  } catch (err) {
    next(err);
  }
});

// =========================
// Route principale
// =========================
app.get("/", (req, res) => {
  res.json({
    message: "Bienvenue sur l'API Gestion de Stages",
    version: "1.0.0",
    health: "/api/health"
  });
});

// =========================
// Fichiers uploadés (statique sécurisé)
//  - chemin construit avec path.join (jamais hors de /uploads) ;
//  - index:false  -> pas de directory listing ;
//  - dotfiles:deny -> refuse l'accès aux fichiers cachés ;
//  - nosniff       -> empêche le navigateur de deviner un autre type MIME.
// Express résout et bloque nativement les traversées "../".
// =========================
app.use(
  "/uploads",
  express.static(UPLOAD_ROOT, {
    index: false,
    dotfiles: "deny",
    redirect: false,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
  })
);

// =========================
// API Routes
// =========================
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/students", require("./routes/student.routes"));
app.use("/api/companies", require("./routes/company.routes"));
app.use("/api/offers", require("./routes/offer.routes"));
app.use("/api/applications", require("./routes/application.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));

// =========================
// Route introuvable (404)
// =========================
app.use((req, res) => {
  res.status(404).json({
    message: "Route introuvable"
  });
});

// =========================
// Gestion globale des erreurs
// =========================
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    message: "Erreur interne du serveur"
  });
});

// =========================
// Lancement du serveur
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});