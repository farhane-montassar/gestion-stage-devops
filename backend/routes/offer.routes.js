const express = require("express");
const router = express.Router();

const {
  createOffer,
  getOffers,
  updateOffer,
  deleteOffer
} = require("../controllers/offer.controller");

const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

router.post("/", verifyToken, authorizeRoles("admin", "company"), createOffer);
router.get("/", verifyToken, getOffers);
router.put("/:id", verifyToken, authorizeRoles("admin", "company"), updateOffer);
router.delete("/:id", verifyToken, authorizeRoles("admin", "company"), deleteOffer);

module.exports = router;