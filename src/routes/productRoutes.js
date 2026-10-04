const express = require("express");
const productController = require("../controllers/productController");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { uploadProductImages } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.get("/products", productController.getPublishedProducts);

router.get("/products/:slug", productController.getProductBySlug);

router.get(
  "/admin/products",
  authenticate,
  authorizeRoles("admin"),
  productController.getAdminProducts,
);

router.get(
  "/admin/product/:id",
  authenticate,
  authorizeRoles("admin"),
  productController.getAdminProduct,
);

router.post(
  "/admin/products",
  authenticate,
  authorizeRoles("admin"),
  uploadProductImages,
  productController.createProduct,
);

router.patch(
  "/admin/product/:id",
  authenticate,
  authorizeRoles("admin"),
  uploadProductImages,
  productController.updateProduct,
);

router.patch(
  "/admin/product/:id/publish",
  authenticate,
  authorizeRoles("admin"),
  productController.togglePublish,
);

router.delete(
  "/admin/product/:id",
  authenticate,
  authorizeRoles("admin"),
  productController.deleteProduct,
);

module.exports = router;
