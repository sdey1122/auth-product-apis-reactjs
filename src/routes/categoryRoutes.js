// const express = require("express");
// const categoryController = require("../controllers/categoryController");
// const { authenticate } = require("../middlewares/authMiddleware");
// const { authorizeRoles } = require("../middlewares/roleMiddleware");
// const { uploadCategoryImage } = require("../middlewares/uploadMiddleware");

// const router = express.Router();

// router.get("/categories", categoryController.getPublishedCategories);

// router.get("/category/:id", categoryController.getCategory);

// router.use(authenticate);
// router.use(authorizeRoles("admin"));

// router.get("/admin/categories", categoryController.getCategories);

// router.post(
//   "/admin/category",
//   uploadCategoryImage,
//   categoryController.createCategory,
// );

// router.patch(
//   "/admin/category/:id",
//   uploadCategoryImage,
//   categoryController.updateCategory,
// );

// router.patch("/admin/category/:id/publish", categoryController.togglePublish);

// router.delete("/admin/category/:id", categoryController.deleteCategory);

// module.exports = router;

const express = require("express");
const categoryController = require("../controllers/categoryController");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { uploadCategoryImage } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.get("/categories", categoryController.getPublishedCategories);

router.get("/category/:id", categoryController.getCategoryById);

router.get(
  "/admin/categories",
  authenticate,
  authorizeRoles("admin"),
  categoryController.getAdminCategories,
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
