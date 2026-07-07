const express = require("express");
const router = express.Router();

const {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  getMyStudent
} = require("../controllers/student.controller");

const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

// Profil de l'étudiant connecté (doit être déclaré avant les routes paramétrées)
router.get("/me", verifyToken, authorizeRoles("student"), getMyStudent);

router.post("/", verifyToken, authorizeRoles("admin"), createStudent);
router.get("/", verifyToken, authorizeRoles("admin"), getStudents);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateStudent);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteStudent);

module.exports = router;
