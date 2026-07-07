const Application = require("../models/application.model");
const { notifyByRole, notifyByEmail } = require("../utils/notification.util");

exports.createApplication = async (req, res) => {
  try {
    const { student, offer, motivation } = req.body;

    if (!student || !offer || !motivation) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    const application = new Application({ student, offer, motivation });
    await application.save();

    // Notifier les gestionnaires (admin + entreprise)
    const payload = {
      title: "Nouvelle candidature",
      message: "Une nouvelle candidature a été déposée.",
      type: "application"
    };
    await notifyByRole("admin", payload);
    await notifyByRole("company", payload);

    res.status(201).json({
      message: "Candidature ajoutée avec succès",
      data: application
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("student")
      .populate({
        path: "offer",
        populate: {
          path: "company"
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["En attente", "Acceptée", "Refusée"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("student");

    if (!application) {
      return res.status(404).json({ message: "Candidature introuvable" });
    }

    // Notifier l'étudiant concerné du résultat
    const studentEmail = application.student?.email;

    if (status === "Acceptée") {
      await notifyByEmail(studentEmail, {
        title: "Candidature acceptée",
        message: "Votre candidature a été acceptée ✅",
        type: "accepted"
      });
    } else if (status === "Refusée") {
      await notifyByEmail(studentEmail, {
        title: "Candidature refusée",
        message: "Votre candidature a été refusée ❌",
        type: "refused"
      });
    }

    res.status(200).json({
      message: "Statut de candidature modifié avec succès",
      data: application
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.deleteApplication = async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Candidature introuvable" });
    }

    res.status(200).json({ message: "Candidature supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};