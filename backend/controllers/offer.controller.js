const Offer = require("../models/offer.model");
const { notifyByRole } = require("../utils/notification.util");

exports.createOffer = async (req, res) => {
  try {
    const { title, description, company, location, duration, level, domain, requiredSkills } = req.body;

    if (!title || !description || !company || !location || !duration || !level || !domain) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    const offer = new Offer({
      title,
      description,
      company,
      location,
      duration,
      level,
      domain,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : []
    });

    await offer.save();

    // Notifier tous les étudiants de la nouvelle offre
    await notifyByRole("student", {
      title: "Nouvelle offre de stage",
      message: `Une nouvelle offre a été publiée : ${title}`,
      type: "offer"
    });

    res.status(201).json({
      message: "Offre de stage ajoutée avec succès",
      data: offer
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate("company")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!offer) {
      return res.status(404).json({ message: "Offre introuvable" });
    }

    res.status(200).json({
      message: "Offre modifiée avec succès",
      data: offer
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({ message: "Offre introuvable" });
    }

    res.status(200).json({ message: "Offre supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};