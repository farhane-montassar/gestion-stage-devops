const dns = require("node:dns");

// DNS Google + Cloudflare (évite les erreurs querySrv sous Windows)
dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

const path = require("node:path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/db");

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
// Connexion MongoDB
// =========================
connectDB();

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
  express.static(path.join(__dirname, "uploads"), {
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