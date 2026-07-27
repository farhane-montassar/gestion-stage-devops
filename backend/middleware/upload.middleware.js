// =============================================================
//  Middleware d'upload sécurisé (multer + Cloudinary)
//  - uploadCv   : PDF uniquement, 5 Mo max      -> Cloudinary (raw)
//  - uploadLogo : JPEG/PNG/WebP, 2 Mo max       -> Cloudinary (image)
//
//  Sécurité :
//   * liste blanche stricte des types MIME ;
//   * limite de taille + 1 seul fichier par requête ;
//   * messages d'erreur propres (400 / 413 / 500).
//
//  Le fichier est gardé EN MÉMOIRE (memoryStorage) puis poussé vers
//  Cloudinary par le contrôleur. Plus aucune écriture sur le disque local.
//
//  UPLOAD_ROOT reste exporté uniquement pour SERVIR les anciens fichiers
//  locaux (/uploads/...) déjà présents avant la migration (rétro-compat).
// =============================================================
const path = require("path");
const multer = require("multer");

// Racine des anciens uploads locaux (rétro-compatibilité de lecture seule).
//  - Par défaut : backend/uploads (résolu depuis backend/middleware).
//  - Configurable via UPLOADS_DIR (ex: disque persistant Render).
const UPLOAD_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, "..", "uploads");

// Correspondance stricte type MIME -> extension autorisée.
const CV_TYPES = {
  "application/pdf": ".pdf"
};

const LOGO_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

// Limites de taille (en octets).
const CV_MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const LOGO_MAX_SIZE = 2 * 1024 * 1024; // 2 Mo

// Le fichier reste en mémoire : aucun fichier temporaire sur le disque.
const memoryStorage = multer.memoryStorage();

// Fabrique une instance multer (memoryStorage + filtre + limites).
function createUploader(typeMap, maxSize) {
  const fileFilter = (req, file, cb) => {
    if (typeMap[file.mimetype]) {
      return cb(null, true);
    }
    // Erreur "métier" : type non autorisé -> traduite en 400 plus bas.
    const err = new Error("Type de fichier non autorisé");
    err.code = "INVALID_FILE_TYPE";
    return cb(err);
  };

  return multer({
    storage: memoryStorage,
    fileFilter,
    limits: { fileSize: maxSize, files: 1 }
  });
}

const cvUploader = createUploader(CV_TYPES, CV_MAX_SIZE);
const logoUploader = createUploader(LOGO_TYPES, LOGO_MAX_SIZE);

// Traduit les erreurs multer en réponses HTTP propres.
function sendUploadError(err, res) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Fichier trop volumineux" });
    }
    return res.status(400).json({ message: "Fichier invalide" });
  }
  if (err && err.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({ message: "Fichier invalide" });
  }
  console.error("Erreur upload:", err);
  return res.status(500).json({ message: "Erreur serveur" });
}

// Enveloppe le middleware multer pour gérer l'erreur SUR PLACE
// (indépendant du gestionnaire d'erreurs global).
function makeUploadMiddleware(uploader, fieldName) {
  return (req, res, next) => {
    uploader.single(fieldName)(req, res, (err) => {
      if (err) return sendUploadError(err, res);
      next();
    });
  };
}

module.exports = {
  uploadCv: makeUploadMiddleware(cvUploader, "cv"),
  uploadLogo: makeUploadMiddleware(logoUploader, "logo"),
  // Exporté pour servir les anciens fichiers locaux (rétro-compat).
  UPLOAD_ROOT
};
