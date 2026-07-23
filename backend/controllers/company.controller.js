const fs = require("fs");
const path = require("path");
const Company = require("../models/company.model");
const User = require("../models/user.model");
const { LOGO_DIR } = require("../middleware/upload.middleware");

// Supprime un fichier physique sans planter si absent (ENOENT ignoré).
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

// Retrouve (ou crée) le profil Company lié au compte connecté, par email.
async function findOrCreateCompany(reqUser) {
  const user = await User.findById(reqUser.id).select("firstName lastName email");
  if (!user) return null;

  let company = await Company.findOne({ email: user.email });
  if (!company) {
    company = await Company.create({
      name: `${user.firstName} ${user.lastName}`.trim() || "Entreprise",
      email: user.email,
      phone: "Non spécifié",
      address: "Non spécifié",
      sector: "Non spécifié"
    });
  }
  return company;
}

exports.createCompany = async (req, res) => {
  try {
    const { name, email, phone, address, sector } = req.body;

    if (!name || !email || !phone || !address || !sector) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    const company = new Company({ name, email, phone, address, sector });
    await company.save();

    res.status(201).json({
      message: "Entreprise ajoutée avec succès",
      data: company
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!company) {
      return res.status(404).json({ message: "Entreprise introuvable" });
    }

    res.status(200).json({
      message: "Entreprise modifiée avec succès",
      data: company
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Entreprise introuvable" });
    }

    res.status(200).json({ message: "Entreprise supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// =========================
// Profil de l'entreprise connectée — GET /api/companies/me
// =========================
exports.getMyCompany = async (req, res) => {
  try {
    const company = await findOrCreateCompany(req.user);
    if (!company) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// =========================
// Upload du logo (rôle company) — POST /api/companies/me/logo
// Le fichier a déjà été validé/enregistré par le middleware uploadLogo.
// =========================
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Fichier invalide" });
    }

    const company = await findOrCreateCompany(req.user);
    if (!company) {
      await safeUnlink(LOGO_DIR, req.file.filename);
      return res.status(404).json({ message: "Profil entreprise introuvable" });
    }

    // Remplacement : suppression de l'ancien logo physique.
    if (company.logo && company.logo.filename) {
      await safeUnlink(LOGO_DIR, company.logo.filename);
    }

    company.logo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/logos/${req.file.filename}`,
      uploadedAt: new Date()
    };
    await company.save();

    return res.status(200).json({
      message: "Logo téléversé avec succès",
      logo: company.logo
    });
  } catch (error) {
    if (req.file) await safeUnlink(LOGO_DIR, req.file.filename);
    console.error("Erreur uploadLogo:", error.message);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// =========================
// Suppression du logo (rôle company) — DELETE /api/companies/me/logo
// =========================
exports.deleteLogo = async (req, res) => {
  try {
    const company = await Company.findOne({ email: req.user.email });

    if (!company || !company.logo || !company.logo.filename) {
      return res.status(404).json({ message: "Aucun logo à supprimer" });
    }

    await safeUnlink(LOGO_DIR, company.logo.filename);
    await Company.updateOne({ _id: company._id }, { $unset: { logo: "" } });

    return res.status(200).json({ message: "Logo supprimé avec succès" });
  } catch (error) {
    console.error("Erreur deleteLogo:", error.message);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};