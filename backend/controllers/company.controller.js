const Company = require("../models/company.model");

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