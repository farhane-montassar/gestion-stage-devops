const Student = require("../models/student.model");
const User = require("../models/user.model");

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