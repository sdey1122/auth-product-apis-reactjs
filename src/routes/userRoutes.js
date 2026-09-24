const express = require("express");
const userController = require("../controllers/userController");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/users", userController.getUsers);

router.patch("/user/:id", userController.updateUser);

router.patch("/user/:userId/:role/change", userController.changeRole);

router.patch("/user/:id/activation", userController.changeActivation);

router.delete("/user/:id", userController.deleteUser);

module.exports = router;
