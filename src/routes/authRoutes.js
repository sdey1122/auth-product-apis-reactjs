const express = require("express");
const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);

router.get("/verify-email/:token", authController.verifyEmail);

router.post("/resend-verification", authController.resendVerification);

router.post("/login", authController.login);

router.post("/login-with-refresh", authController.loginWithRefresh);

router.post("/refresh-token", authController.refreshToken);

router.post("/logout", authenticate, authController.logout);

module.exports = router;
