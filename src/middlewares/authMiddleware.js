const jwt = require("jsonwebtoken");
const User = require("../models/User");
const HTTP_STATUS = require("../utils/httpStatusCode");
const logger = require("../utils/logger");

const authenticate = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    const accessTokenHeader = req.headers["x-access-token"];

    let token;

    if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
      token = authorizationHeader.split(" ")[1];
    } else if (accessTokenHeader) {
      token = accessTokenHeader;
    }

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Please login to continue",
      });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);

    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};

module.exports = {
  authenticate,
};
