const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} = require("../controllers/notification.controller");

const { verifyToken } = require("../middleware/auth.middleware");

// Toutes accessibles à tout utilisateur connecté (filtrées par req.user.id)
router.get("/", verifyToken, getMyNotifications);
router.put("/read-all", verifyToken, markAllAsRead);
router.put("/:id/read", verifyToken, markAsRead);

module.exports = router;
