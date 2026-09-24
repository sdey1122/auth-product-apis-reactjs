require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/User");
const logger = require("./logger");

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
    }

    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      logger.info(`Admin already exists: ${existingAdmin.email}`);
      process.exit(0);
    }

    const existingUser = await User.findOne({
      email: adminEmail.toLowerCase(),
    });

    if (existingUser) {
      existingUser.role = "admin";
      existingUser.isVerified = true;
      existingUser.isActive = true;
      existingUser.password = adminPassword;
      existingUser.emailVerificationToken = undefined;
      existingUser.emailVerificationExpires = undefined;

      await existingUser.save();

      logger.info(`Existing user promoted to admin: ${existingUser.email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: "Admin",
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: "admin",
      isVerified: true,
      isActive: true,
    });

    logger.info(`Admin created successfully: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    logger.error(`Admin seed failed: ${error.stack}`);
    process.exit(1);
  }
};

seedAdmin();
