const express = require("express");
const router = express.Router();

const {
  createApplication,
  getApplications,
  updateApplicationStatus,
  deleteApplication
} = require("../controllers/application.controller");

const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

router.post("/", verifyToken, authorizeRoles("student"), createApplication);
router.get("/", verifyToken, authorizeRoles("admin", "company", "student"), getApplications);
router.put("/:id/status", verifyToken, authorizeRoles("admin", "company"), updateApplicationStatus);
router.delete("/:id", verifyToken, authorizeRoles("admin", "student"), deleteApplication);

module.exports = router;