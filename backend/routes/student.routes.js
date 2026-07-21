const express = require("express");
const router = express.Router();

const {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  getMyStudent,
  uploadCv,
  deleteCv
} = require("../controllers/student.controller");

const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");
const { uploadCv: uploadCvMiddleware } = require("../middleware/upload.middleware");

// Profil de l'étudiant connecté (doit être déclaré avant les routes paramétrées)
router.get("/me", verifyToken, authorizeRoles("student"), getMyStudent);

// CV de l'étudiant connecté (JWT + rôle student obligatoires)
router.post(
  "/me/cv",
  verifyToken,
  authorizeRoles("student"),
  uploadCvMiddleware,
  uploadCv
);
router.delete("/me/cv", verifyToken, authorizeRoles("student"), deleteCv);

router.post("/", verifyToken, authorizeRoles("admin"), createStudent);
router.get("/", verifyToken, authorizeRoles("admin"), getStudents);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateStudent);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteStudent);

module.exports = router;
