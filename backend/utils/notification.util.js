const Notification = require("../models/notification.model");
const User = require("../models/user.model");

/**
 * Crée une notification pour un utilisateur précis.
 * Les erreurs sont capturées ici pour ne jamais casser le flux appelant.
 */
exports.createNotification = async ({ user, title, message, type }) => {
  try {
    await Notification.create({ user, title, message, type });
  } catch (error) {
    console.error("Notification (create):", error.message);
  }
};

/**
 * Envoie une notification à tous les utilisateurs d'un rôle donné.
 */
exports.notifyByRole = async (role, { title, message, type }) => {
  try {
    const users = await User.find({ role }).select("_id");
    if (!users.length) return;

    const docs = users.map((u) => ({ user: u._id, title, message, type }));
    await Notification.insertMany(docs);
  } catch (error) {
    console.error("Notification (role):", error.message);
  }
};

/**
 * Envoie une notification à l'utilisateur identifié par son email
 * (utilisé pour prévenir l'étudiant lié à une candidature).
 */
exports.notifyByEmail = async (email, { title, message, type }) => {
  try {
    if (!email) return;

    const user = await User.findOne({ email }).select("_id");
    if (!user) return;

    await Notification.create({ user: user._id, title, message, type });
  } catch (error) {
    console.error("Notification (email):", error.message);
  }
};
