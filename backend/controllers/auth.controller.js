const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Student = require("../models/student.model");
const Company = require("../models/company.model");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rôles autorisés à l'inscription publique (admin volontairement exclu)
const PUBLIC_ROLES = ["student", "company"];

// Génère un JWT contenant id, role et email
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// Crée (ou relie) le profil métier correspondant au rôle.
// Compatibilité : si un profil existe déjà pour cet email (ancien document),
// on le relie au compte au lieu d'en créer un doublon.
const createBusinessProfile = async (user) => {
  if (user.role === "student") {
    const existing = await Student.findOne({ email: user.email });
    if (existing) {
      if (!existing.user) {
        existing.user = user._id;
        await existing.save();
      }
      return existing;
    }
    return Student.create({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      level: "Non spécifié",
      domain: "Non spécifié",
      skills: [],
      user: user._id
    });
  }

  if (user.role === "company") {
    const existing = await Company.findOne({ email: user.email });
    if (existing) {
      if (!existing.user) {
        existing.user = user._id;
        await existing.save();
      }
      return existing;
    }
    return Company.create({
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: "Non spécifié",
      address: "Non spécifié",
      sector: "Non spécifié",
      user: user._id
    });
  }

  return null;
};

exports.register = async (req, res) => {
  try {
    let { firstName, lastName, email, password, role } = req.body;

    // Champs obligatoires
    if (!firstName || !lastName || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Tous les champs sont obligatoires" });
    }

    // Normalisation
    email = String(email).trim().toLowerCase();
    firstName = String(firstName).trim();
    lastName = String(lastName).trim();

    // Email valide
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Adresse email invalide" });
    }

    // Mot de passe minimum 8 caractères
    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ message: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    // Rôle : uniquement student ou company (admin et rôles inconnus refusés)
    if (!PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    // Unicité de l'email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Un compte existe déjà avec cet email" });
    }

    // Création du compte
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role
    });

    // Création automatique du profil métier avec rollback en cas d'échec
    try {
      await createBusinessProfile(user);
    } catch (profileError) {
      await User.findByIdAndDelete(user._id);
      console.error("Echec création profil métier:", profileError.message);
      return res
        .status(500)
        .json({ message: "Impossible de créer le profil, veuillez réessayer" });
    }

    const token = generateToken(user);

    return res.status(201).json({
      message: "Compte créé avec succès",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    // Doublon détecté au niveau index (course entre deux inscriptions)
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Un compte existe déjà avec cet email" });
    }
    console.error("Erreur register:", error.message);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe obligatoires" });
    }

    email = String(email).trim().toLowerCase();

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Connexion réussie",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Erreur login:", error.message);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
