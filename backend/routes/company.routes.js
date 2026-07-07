const express = require("express");
const router = express.Router();

const {
  createCompany,
  getCompanies,
  updateCompany,
  deleteCompany
} = require("../controllers/company.controller");

const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

router.post("/", verifyToken, authorizeRoles("admin"), createCompany);
router.get("/", verifyToken, authorizeRoles("admin"), getCompanies);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateCompany);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCompany);

module.exports = router;