const HTTP_STATUS = require("../utils/httpStatusCode");

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Please login to continue",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
