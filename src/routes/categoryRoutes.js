const express = require("express");
const categoryController = require("../controllers/categoryController");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { uploadCategoryImage } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.get("/categories", categoryController.getPublishedCategories);

router.get("/category/:id", categoryController.getCategory);

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/admin/categories", categoryController.getCategories);

router.post(
  "/admin/category",
  uploadCategoryImage,
  categoryController.createCategory,
);

router.patch(
  "/admin/category/:id",
  uploadCategoryImage,
  categoryController.updateCategory,
);

router.patch("/admin/category/:id/publish", categoryController.togglePublish);

router.delete("/admin/category/:id", categoryController.deleteCategory);

module.exports = router;
