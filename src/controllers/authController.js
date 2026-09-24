const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const HTTP_STATUS = require("../utils/httpStatusCode");
const logger = require("../utils/logger");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");

const { verifyRefreshToken } = require("../utils/tokenUtils");

const sendVerificationEmail = require("../utils/sendVerificationEmail");
const sanitizeUser = require("../utils/sanitizeUser");

class AuthController {
  register = async (req, res) => {
    try {
      const { name, email, password, confirmPassword } = req.body;

      if (!name || !email || !password || !confirmPassword) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "All fields are required",
        });
      }

      if (password !== confirmPassword) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Password and confirm password do not match",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }

      if (
        process.env.ADMIN_EMAIL &&
        normalizedEmail === process.env.ADMIN_EMAIL.trim().toLowerCase()
      ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "This email cannot be registered as a user",
        });
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: "Email is already registered",
        });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: "user",
        isVerified: false,
        isActive: true,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpires: verificationExpires,
      });

      try {
        await sendVerificationEmail(normalizedEmail, verificationToken);
      } catch (emailError) {
        await User.findByIdAndDelete(user._id);

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Unable to send verification email",
        });
      }

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Registration successful. Please verify your email",
        user: sanitizeUser(user),
      });
    } catch (error) {
      logger.error(`Register error: ${error.stack}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  verifyEmail = async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Verification token is required",
        });
      }

      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Invalid or expired verification token",
        });
      }

      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;

      await user.save();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      logger.error(`Verify email error: ${error.stack}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  resendVerification = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Email is required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const user = await User.findOne({
        email: normalizedEmail,
      });

      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isVerified) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Email is already verified",
        });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");

      user.emailVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

      user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

      await user.save();

      await sendVerificationEmail(normalizedEmail, verificationToken);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error) {
      logger.error(`Resend verification error: ${error.stack}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Unable to send verification email",
      });
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      let user;

      if (
        process.env.ADMIN_EMAIL &&
        normalizedEmail === process.env.ADMIN_EMAIL.trim().toLowerCase() &&
        password === process.env.ADMIN_PASSWORD
      ) {
        user = await User.findOne({
          email: normalizedEmail,
        });

        if (!user) {
          user = await User.create({
            name: "Admin",
            email: normalizedEmail,
            password: process.env.ADMIN_PASSWORD,
            role: "admin",
            isVerified: true,
            isActive: true,
          });
        }
      } else {
        user = await User.findOne({
          email: normalizedEmail,
        });

        if (!user) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: "Invalid email or password",
          });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: "Invalid email or password",
          });
        }
      }

      if (user.role !== "admin" && !user.isVerified) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "Please verify your email before login",
        });
      }

      if (!user.isActive) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "Your account has been deactivated",
        });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      await user.save();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Login successful",
        user: sanitizeUser(user),
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      logger.error(`Login error: ${error.stack}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  loginWithRefresh = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      let user;

      if (
        process.env.ADMIN_EMAIL &&
        normalizedEmail === process.env.ADMIN_EMAIL.trim().toLowerCase() &&
        password === process.env.ADMIN_PASSWORD
      ) {
        user = await User.findOne({
          email: normalizedEmail,
        });

        if (!user) {
          user = await User.create({
            name: "Admin",
            email: normalizedEmail,
            password: process.env.ADMIN_PASSWORD,
            role: "admin",
            isVerified: true,
            isActive: true,
          });
        }
      } else {
        user = await User.findOne({
          email: normalizedEmail,
        });

        if (!user) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: "Invalid email or password",
          });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: "Invalid email or password",
          });
        }
      }

      if (user.role !== "admin" && !user.isVerified) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "Please verify your email before login",
        });
      }

      if (!user.isActive) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "Your account has been deactivated",
        });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      await user.save();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Login successful",
        user: sanitizeUser(user),
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      logger.error(`Login with refresh error: ${error.stack}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      const decoded = verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.refreshToken !== refreshToken) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      if (!user.isActive) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "Your account has been deactivated",
        });
      }

      const accessToken = generateAccessToken(user);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Access token refreshed successfully",
        access_token: accessToken,
      });
    } catch (error) {
      logger.error(`Refresh token error: ${error.message}`);

      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }
  };

  logout = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "User not found",
        });
      }

      user.refreshToken = undefined;

      await user.save();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      logger.error(`Logout error: ${error.stack}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

module.exports = new AuthController();
