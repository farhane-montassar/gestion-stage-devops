const fs = require("fs");
const path = require("path");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const { UPLOAD_ROOT } = require("../middleware/upload.middleware");
const { uploadBuffer, destroyResource } = require("../config/cloudinary");

// Les CV sont téléversés comme ressources Cloudinary "raw" (PDF servi tel quel).
const CV_FOLDER = "gestion-stage/cv";
const CV_RESOURCE_TYPE = "raw";
// Racine locale des anciens CV (rétro-compat : nettoyage des fichiers pré-migration).
const LEGACY_CV_DIR = path.join(UPLOAD_ROOT, "cv");

// Multer décode le nom d'origine en latin1 : on le ré-interprète en UTF-8
// pour restaurer les accents (ex: "SociÃ©tÃ©.pdf" -> "Société.pdf").
function decodeOriginalName(name) {
  if (!name) return name;
  return Buffer.from(name, "latin1").toString("utf8");
}

// Supprime un fichier physique local sans planter si absent (ENOENT ignoré).
async function safeUnlink(dir, filename) {
  if (!filename) return;
  try {
    await fs.promises.unlink(path.join(dir, path.basename(filename)));
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Suppression fichier échouée:", err.message);
    }
  }
}

// Supprime l'ancien CV, qu'il soit sur Cloudinary (publicId)
// ou un ancien fichier local (filename) d'avant la migration.
async function removeOldCv(cv) {
  if (!cv) return;
  if (cv.publicId) {
    await destroyResource(cv.publicId, CV_RESOURCE_TYPE);
  } else if (cv.filename) {
    await safeUnlink(LEGACY_CV_DIR, cv.filename);
  }
}

// Retrouve (ou crée) le profil Student lié au compte connecté, par email.
async function findOrCreateStudent(reqUser) {
  const user = await User.findById(reqUser.id).select("firstName lastName email");
  if (!user) return null;

  let student = await Student.findOne({ email: user.email });
  if (!student) {
    student = await Student.create({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      level: "Non spécifié",
      domain: "Non spécifié"
    });
  }
  return student;
}

exports.createStudent = async (req, res) => {
  try {
    const { firstName, lastName, email, level, domain, skills } = req.body;

    if (!firstName || !lastName || !email || !level || !domain) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    const student = new Student({
      firstName,
      lastName,
      email,
      level,
      domain,
      skills: Array.isArray(skills) ? skills : []
    });
    await student.save();

    res.status(201).json({
      message: "Étudiant ajouté avec succès",
      data: student
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!student) {
      return res.status(404).json({ message: "Étudiant introuvable" });
    }

    res.status(200).json({
      message: "Étudiant modifié avec succès",
      data: student
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Étudiant introuvable" });
    }

    res.status(200).json({ message: "Étudiant supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Retourne (ou crée) le profil Student lié au compte connecté (rôle student).
// Le lien se fait par email : User.email <-> Student.email.
exports.getMyStudent = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("firstName lastName email");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    let student = await Student.findOne({ email: user.email });

    // Auto-création du profil étudiant si aucun n'est encore lié au compte
    if (!student) {
      student = await Student.create({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        level: "Non spécifié",
        domain: "Non spécifié"
      });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// =========================
// Upload du CV (rôle student) — POST /api/students/me/cv
// Le fichier a déjà été validé par le middleware uploadCv (memoryStorage).
// Il est ici poussé vers Cloudinary, puis ses métadonnées sont persistées.
// =========================
exports.uploadCv = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Fichier invalide" });
    }

    const student = await findOrCreateStudent(req.user);
    if (!student) {
      return res.status(404).json({ message: "Profil étudiant introuvable" });
    }

    // Téléversement du buffer (en mémoire) vers Cloudinary.
    const result = await uploadBuffer(req.file.buffer, {
      folder: CV_FOLDER,
      resourceType: CV_RESOURCE_TYPE,
      originalName: req.file.originalname
    });

    // Remplacement : suppression de l'ancien CV (Cloudinary ou local legacy).
    await removeOldCv(student.cv);

    // On stocke l'URL sécurisée Cloudinary + le public_id (pour suppression future).
    student.cv = {
      publicId: result.public_id,
      originalName: decodeOriginalName(req.file.originalname),
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: result.secure_url,
      uploadedAt: new Date()
    };
    await student.save();

    return res.status(200).json({
      message: "CV téléversé avec succès",
      cv: student.cv
    });
  } catch (error) {
    console.error("Erreur uploadCv:", error.message);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// =========================
// Suppression du CV (rôle student) — DELETE /api/students/me/cv
// =========================
exports.deleteCv = async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.user.email });

    if (!student || !student.cv || (!student.cv.publicId && !student.cv.filename)) {
      return res.status(404).json({ message: "Aucun CV à supprimer" });
    }

    // Supprime la ressource Cloudinary (ou l'ancien fichier local).
    await removeOldCv(student.cv);

    // $unset pour retirer proprement le sous-document.
    await Student.updateOne({ _id: student._id }, { $unset: { cv: "" } });

    return res.status(200).json({ message: "CV supprimé avec succès" });
  } catch (error) {
    console.error("Erreur deleteCv:", error.message);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};