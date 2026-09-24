const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    // Reuse existing connection on Vercel's serverless instances
    if (mongoose.connection.readyState === 1) {
      return;
    }

    await mongoose.connect(process.env.MONGO_URI);

    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);

    // Not killing the Vercel serverless function
    throw error;
  }
};

module.exports = connectDB;
