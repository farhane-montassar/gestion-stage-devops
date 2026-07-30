const {
  httpRequestsTotal,
  httpRequestDuration,
} = require("../config/metrics");

/**
 * Construit le label "route" d'une métrique Prometheus.
 *
 * Règle d'or : ne JAMAIS utiliser l'URL brute (req.path). Chaque identifiant
 * MongoDB créerait une nouvelle série temporelle ("/api/offers/68f3..."),
 * ce qui fait exploser la cardinalité et sature Prometheus.
 * On utilise donc le MOTIF de route déclaré par Express.
 */
const getRouteLabel = (req) => {
  // Route matchée : baseUrl = préfixe de montage du routeur ("/api/offers"),
  // req.route.path = motif déclaré ("/:id")  ->  "/api/offers/:id".
  if (req.route?.path) {
    const base = req.baseUrl || "";
    const path = req.route.path === "/" ? "" : req.route.path;

    return `${base}${path}` || "/";
  }

  // Réponse émise par un middleware monté (ex. express.static sur /uploads)
  // sans route déclarée : on agrège sous le préfixe de montage.
  if (req.baseUrl) {
    return `${req.baseUrl}/*`;
  }

  // Aucune route n'a matché (404) : tout est agrégé sur un label unique
  // pour éviter qu'un scan d'URLs ne génère des milliers de séries.
  return "unmatched";
};

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  // "finish" = dernier octet de la réponse écrit sur la socket. À cet instant
  // le routage a eu lieu : req.route / req.baseUrl sont renseignés.
  res.on("finish", () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;

    const labels = {
      method: req.method,
      route: getRouteLabel(req),
      status_code: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
  });

  next();
};

module.exports = metricsMiddleware;
