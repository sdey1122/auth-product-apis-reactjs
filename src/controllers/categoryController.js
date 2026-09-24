const Category = require("../models/Category");
const HTTP_STATUS = require("../utils/httpStatusCode");
const logger = require("../utils/logger");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/uploadToCloudinary");

class CategoryController {
  getPublishedCategories = async (req, res) => {
    try {
      const categories = await Category.find({
        isPublished: true,
      }).sort({ createdAt: -1 });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Published categories fetched successfully",
        data: categories,
      });
    } catch (error) {
      logger.error(`Get published categories error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  getCategories = async (req, res) => {
    try {
      let { page = 1, limit = 10, isPublished } = req.query;

      page = Math.max(Number(page) || 1, 1);
      limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

      const filter = {};

      if (isPublished !== undefined) {
        if (!["true", "false"].includes(isPublished)) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: "isPublished must be true or false",
          });
        }

        filter.isPublished = isPublished === "true";
      }

      const skip = (page - 1) * limit;

      const [categories, totalCategories] = await Promise.all([
        Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Category.countDocuments(filter),
      ]);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Categories fetched successfully",
        data: categories,
        pagination: {
          totalPages: Math.ceil(totalCategories / limit),
          totalCategories,
          currentPage: page,
          limit,
        },
      });
    } catch (error) {
      logger.error(`Get categories error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  getCategory = async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Category not found",
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Category fetched successfully",
        data: category,
      });
    } catch (error) {
      logger.error(`Get category error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  createCategory = async (req, res) => {
    try {
      const { name, description, isPublished } = req.body;

      if (!name || !description || !req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Name, description and image are required",
        });
      }

      const existingCategory = await Category.findOne({
        name: name.trim(),
      });

      if (existingCategory) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: "Category already exists",
        });
      }

      // Multer memoryStorage provides req.file.buffer.
      const uploadedImage = await uploadToCloudinary(
        req.file.buffer,
        "role-auth/categories",
      );

      const category = await Category.create({
        name: name.trim(),
        description: description.trim(),
        isPublished: isPublished === true || isPublished === "true",
        image: uploadedImage,
      });

      logger.info(`Category created: ${category.name}`);

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      logger.error(`Create category error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isPublished } = req.body;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Category not found",
        });
      }

      if (name) {
        const existingCategory = await Category.findOne({
          name: name.trim(),
          _id: { $ne: id },
        });

        if (existingCategory) {
          return res.status(HTTP_STATUS.CONFLICT).json({
            success: false,
            message: "Category already exists",
          });
        }

        category.name = name.trim();
      }

      if (description) {
        category.description = description.trim();
      }

      if (isPublished !== undefined) {
        category.isPublished = isPublished === true || isPublished === "true";
      }

      if (req.file) {
        const oldPublicId = category.image?.publicId;

        // Upload the new image directly from memory.
        const uploadedImage = await uploadToCloudinary(
          req.file.buffer,
          "role-auth/categories",
        );

        category.image = uploadedImage;

        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch (deleteError) {
            logger.error(
              `Old category image deletion failed: ${deleteError.message}`,
            );
          }
        }
      }

      await category.save();

      logger.info(`Category updated: ${category.name}`);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      logger.error(`Update category error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  togglePublish = async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Category not found",
        });
      }

      category.isPublished = !category.isPublished;

      await category.save();

      logger.info(
        `Category publish status changed: ${category.name} -> ${category.isPublished}`,
      );

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Category ${
          category.isPublished ? "published" : "unpublished"
        } successfully`,
        data: category,
      });
    } catch (error) {
      logger.error(`Toggle category publish error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  deleteCategory = async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Category not found",
        });
      }

      if (category.image?.publicId) {
        try {
          await deleteFromCloudinary(category.image.publicId);
        } catch (deleteError) {
          logger.error(
            `Category image deletion failed: ${deleteError.message}`,
          );
        }
      }

      await Category.findByIdAndDelete(id);

      logger.info(`Category deleted: ${category.name}`);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      logger.error(`Delete category error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };
}

module.exports = new CategoryController();
