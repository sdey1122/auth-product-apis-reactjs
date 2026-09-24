const User = require("../models/User");
const HTTP_STATUS = require("../utils/httpStatusCode");
const sanitizeUser = require("../utils/sanitizeUser");
const logger = require("../utils/logger");

class UserController {
  getUsers = async (req, res) => {
    try {
      let { page = 1, limit = 10, role, isActive } = req.query;

      page = Math.max(Number(page) || 1, 1);
      limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

      const filter = {};

      if (role) {
        if (!["user", "admin"].includes(role)) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: "Invalid role",
          });
        }

        filter.role = role;
      }

      if (isActive !== undefined) {
        if (!["true", "false"].includes(isActive)) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: "isActive must be true or false",
          });
        }

        filter.isActive = isActive === "true";
      }

      const skip = (page - 1) * limit;

      const [users, totalUsers] = await Promise.all([
        User.find(filter)
          .select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpires",
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalUsers / limit);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Users fetched successfully",
        data: users.map(sanitizeUser),
        pagination: {
          totalPages,
          totalUsers,
          currentPage: page,
          limit,
        },
      });
    } catch (error) {
      logger.error(`Get users error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  updateUser = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email } = req.body;

      if (!name && !email) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "At least one field is required",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "User not found",
        });
      }

      if (name) {
        user.name = name.trim();
      }

      if (email) {
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: id },
        });

        if (existingUser) {
          return res.status(HTTP_STATUS.CONFLICT).json({
            success: false,
            message: "Email already in use",
          });
        }

        user.email = normalizedEmail;
      }

      await user.save();

      logger.info(`User updated by admin: ${user.email}`);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "User updated successfully",
        user: sanitizeUser(user),
      });
    } catch (error) {
      logger.error(`Update user error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  changeRole = async (req, res) => {
    try {
      const { role } = req.params;
      const { userId } = req.body;

      if (!["user", "admin"].includes(role)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Invalid role",
        });
      }

      if (!userId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "userId is required",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "User not found",
        });
      }

      if (user._id.toString() === req.user._id.toString()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "You cannot change your own role",
        });
      }

      user.role = role;

      if (role === "admin") {
        user.isVerified = true;
      }

      await user.save();

      logger.info(`User role changed by admin: ${user.email} -> ${role}`);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "User role changed successfully",
        user: sanitizeUser(user),
      });
    } catch (error) {
      logger.error(`Change role error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  changeActivation = async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "User not found",
        });
      }

      if (user._id.toString() === req.user._id.toString()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "You cannot change your own activation status",
        });
      }

      user.isActive = !user.isActive;

      await user.save();

      logger.info(
        `User activation changed by admin: ${user.email} -> ${user.isActive}`,
      );

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
        user: sanitizeUser(user),
      });
    } catch (error) {
      logger.error(`Change activation error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  deleteUser = async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "User not found",
        });
      }

      if (user._id.toString() === req.user._id.toString()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      await User.findByIdAndDelete(id);

      logger.info(`User deleted by admin: ${user.email}`);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      logger.error(`Delete user error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };
}

module.exports = new UserController();
