const client = require("prom-client");

// Registre Prometheus
const register = new client.Registry();

// Métriques Node.js par défaut : mémoire, CPU, event loop...
client.collectDefaultMetrics({
  register,
  prefix: "gestion_stage_",
});

// Nombre total de requêtes HTTP
const httpRequestsTotal = new client.Counter({
  name: "gestion_stage_http_requests_total",
  help: "Nombre total de requêtes HTTP",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// Durée des requêtes HTTP
const httpRequestDuration = new client.Histogram({
  name: "gestion_stage_http_request_duration_seconds",
  help: "Durée des requêtes HTTP en secondes",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
};