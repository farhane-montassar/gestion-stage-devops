// =============================================================
//  Middleware d'upload sécurisé (multer)
//  - uploadCv   : PDF uniquement, 5 Mo max      -> uploads/cv
//  - uploadLogo : JPEG/PNG/WebP, 2 Mo max       -> uploads/logos
//
//  Sécurité :
//   * liste blanche stricte des types MIME ;
//   * extension DÉRIVÉE du type MIME (anti-spoof "cv.pdf.exe") ;
//   * nom de fichier "timestamp-random-nom-sanitized" (unique) ;
//   * path.basename() pour neutraliser toute traversée de répertoire ;
//   * limite de taille + 1 seul fichier par requête ;
//   * messages d'erreur propres (400 / 413 / 500).
//
//  On ne stocke JAMAIS le chemin absolu : les contrôleurs enregistrent
//  une URL relative de la forme /uploads/cv/<fichier>.
// =============================================================
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

// Dossiers physiques (résolus depuis backend/middleware -> backend/uploads/...)
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const CV_DIR = path.join(UPLOAD_ROOT, "cv");
const LOGO_DIR = path.join(UPLOAD_ROOT, "logos");

// S'assure que les dossiers existent (utile au 1er démarrage / volume vide).
for (const dir of [CV_DIR, LOGO_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Correspondance stricte type MIME -> extension imposée.
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

// Nettoie le nom d'origine : on ne garde que des caractères sûrs.
function sanitizeBaseName(originalName) {
  // path.basename neutralise "../", "..\\", chemins absolus, etc.
  const base = path.basename(originalName || "");
  const withoutExt = base.replace(path.extname(base), "");
  const safe = withoutExt
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]/g, "-") // remplace tout caractère non sûr
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return safe || "fichier";
}

// Génère un nom unique et sûr, avec extension IMPOSÉE par le type MIME.
function buildFilename(originalName, mimeType, typeMap) {
  const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const safeName = sanitizeBaseName(originalName);
  const ext = typeMap[mimeType] || "";
  return `${unique}-${safeName}${ext}`;
}

// Fabrique une instance multer (storage + filtre + limites).
function createUploader(destDir, typeMap, maxSize) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) =>
      cb(null, buildFilename(file.originalname, file.mimetype, typeMap))
  });

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
    storage,
    fileFilter,
    limits: { fileSize: maxSize, files: 1 }
  });
}

const cvUploader = createUploader(CV_DIR, CV_TYPES, CV_MAX_SIZE);
const logoUploader = createUploader(LOGO_DIR, LOGO_TYPES, LOGO_MAX_SIZE);

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
  // Constantes exportées pour d'éventuels tests / réutilisation.
  CV_DIR,
  LOGO_DIR,
  UPLOAD_ROOT
};
