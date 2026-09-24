const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const categoryRoutes = require("./categoryRoutes");
const productRoutes = require("./productRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", userRoutes);
router.use("/", categoryRoutes);
router.use("/", productRoutes);

module.exports = router;
