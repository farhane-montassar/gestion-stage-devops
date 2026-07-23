const express = require("express");
const router = express.Router();

const {
  createCompany,
  getCompanies,
  updateCompany,
  deleteCompany,
  getMyCompany,
  uploadLogo,
  deleteLogo
} = require("../controllers/company.controller");

const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");
const { uploadLogo: uploadLogoMiddleware } = require("../middleware/upload.middleware");

// Profil + logo de l'entreprise connectée (déclarés avant les routes /:id)
router.get("/me", verifyToken, authorizeRoles("company"), getMyCompany);
router.post(
  "/me/logo",
  verifyToken,
  authorizeRoles("company"),
  uploadLogoMiddleware,
  uploadLogo
);
router.delete("/me/logo", verifyToken, authorizeRoles("company"), deleteLogo);

router.post("/", verifyToken, authorizeRoles("admin"), createCompany);
router.get("/", verifyToken, authorizeRoles("admin"), getCompanies);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateCompany);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCompany);

module.exports = router;