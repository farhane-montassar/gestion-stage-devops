const dns = require("node:dns");

// DNS Google + Cloudflare (évite les erreurs querySrv sous Windows)
dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/db");

const app = express();

// =========================
// Middlewares
// =========================
app.use(cors());
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