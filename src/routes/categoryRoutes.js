const express = require("express");
const categoryController = require("../controllers/categoryController");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { uploadCategoryImage } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.get("/categories", categoryController.getPublishedCategories);

router.get("/category/:id", categoryController.getCategory);

router.get(
  "/admin/categories",
  authenticate,
  authorizeRoles("admin"),
  categoryController.getCategories,
);

router.post(
  "/admin/category",
  authenticate,
  authorizeRoles("admin"),
  uploadCategoryImage,
  categoryController.createCategory,
);

router.patch(
  "/admin/category/:id",
  authenticate,
  authorizeRoles("admin"),
  uploadCategoryImage,
  categoryController.updateCategory,
);

router.patch(
  "/admin/category/:id/publish",
  authenticate,
  authorizeRoles("admin"),
  categoryController.togglePublish,
);

router.delete(
  "/admin/category/:id",
  authenticate,
  authorizeRoles("admin"),
  categoryController.deleteCategory,
);

module.exports = router;
