// =============================================================
//  Configuration Cloudinary + helpers d'upload / suppression.
//
//  Les secrets proviennent EXCLUSIVEMENT des variables d'environnement
//  (jamais du code, jamais du frontend) :
//    - CLOUDINARY_CLOUD_NAME
//    - CLOUDINARY_API_KEY
//    - CLOUDINARY_API_SECRET
//
//  Types de ressources utilisés :
//    - Logos entreprise : resource_type "image"  (JPEG/PNG/WebP)
//    - CV étudiants      : resource_type "raw"    (PDF servi tel quel)
// =============================================================
const { v2: cloudinary } = require("cloudinary");
const crypto = require("crypto");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Vrai si les 3 variables sont présentes (utile pour un message clair au démarrage).
function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

// Nettoie un nom d'origine pour l'utiliser comme public_id lisible et sûr.
function sanitizeBaseName(originalName) {
  const withoutExt = String(originalName || "").replace(/\.[^.]+$/, "");
  const safe = withoutExt
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return safe || "fichier";
}

/**
 * Téléverse un buffer (Multer memoryStorage) vers Cloudinary.
 *
 * @param {Buffer} buffer        Contenu du fichier en mémoire.
 * @param {Object} options
 * @param {string} options.folder        Dossier Cloudinary (ex: "gestion-stage/cv").
 * @param {"image"|"raw"} options.resourceType  Type de ressource Cloudinary.
 * @param {string} [options.originalName] Nom d'origine (pour un public_id lisible).
 * @returns {Promise<{ secure_url: string, public_id: string, bytes: number, resource_type: string }>}
 */
function uploadBuffer(buffer, { folder, resourceType, originalName }) {
  return new Promise((resolve, reject) => {
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const publicId = `${unique}-${sanitizeBaseName(originalName)}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        overwrite: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

/**
 * Supprime une ressource Cloudinary sans faire planter l'appelant.
 * @param {string} publicId
 * @param {"image"|"raw"} resourceType
 */
async function destroyResource(publicId, resourceType) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "image",
      invalidate: true
    });
  } catch (err) {
    console.error("Suppression Cloudinary échouée:", err.message);
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBuffer,
  destroyResource
};
