const Product = require("../models/Product");
const Category = require("../models/Category");
const HTTP_STATUS = require("../utils/httpStatusCode");
const logger = require("../utils/logger");
const slugify = require("../utils/slugify");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/uploadToCloudinary");

class ProductController {
  getPublishedProducts = async (req, res) => {
    try {
      const { category, search, minprice, maxprice } = req.query;

      const filter = {
        isPublished: true,
      };

      if (category) {
        const categoryData = await Category.findOne({
          $or: [
            { _id: category },
            {
              name: {
                $regex: `^${category}$`,
                $options: "i",
              },
            },
          ],
          isPublished: true,
        });

        if (!categoryData) {
          return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Products fetched successfully",
            data: [],
          });
        }

        filter.category = categoryData._id;
      }

      if (search) {
        filter.title = {
          $regex: search,
          $options: "i",
        };
      }

      if (minprice !== undefined || maxprice !== undefined) {
        filter.price = {};

        if (minprice !== undefined) {
          const minimumPrice = Number(minprice);

          if (Number.isNaN(minimumPrice) || minimumPrice < 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: "Invalid minimum price",
            });
          }

          filter.price.$gte = minimumPrice;
        }

        if (maxprice !== undefined) {
          const maximumPrice = Number(maxprice);

          if (Number.isNaN(maximumPrice) || maximumPrice < 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: "Invalid maximum price",
            });
          }

          filter.price.$lte = maximumPrice;
        }

        if (
          filter.price.$gte !== undefined &&
          filter.price.$lte !== undefined &&
          filter.price.$gte > filter.price.$lte
        ) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: "Minimum price cannot be greater than maximum price",
          });
        }
      }

      const products = await Product.find(filter)
        .populate("category", "name")
        .sort({ createdAt: -1 });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Products fetched successfully",
        data: products,
      });
    } catch (error) {
      logger.error(`Get published products error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  getProductBySlug = async (req, res) => {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({
        slug,
        isPublished: true,
      }).populate("category", "name description");

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Product fetched successfully",
        data: product,
      });
    } catch (error) {
      logger.error(`Get product by slug error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  getAdminProducts = async (req, res) => {
    try {
      let { category, search, page = 1, limit = 10, isPublished } = req.query;

      page = Math.max(Number(page) || 1, 1);
      limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

      const filter = {};

      if (category) {
        const categoryData = await Category.findOne({
          $or: [
            { _id: category },
            {
              name: {
                $regex: `^${category}$`,
                $options: "i",
              },
            },
          ],
        });

        if (!categoryData) {
          return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Products fetched successfully",
            data: [],
            pagination: {
              totalPages: 0,
              totalProducts: 0,
              currentPage: page,
              limit,
            },
          });
        }

        filter.category = categoryData._id;
      }

      if (search) {
        filter.title = {
          $regex: search,
          $options: "i",
        };
      }

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

      const [products, totalProducts] = await Promise.all([
        Product.find(filter)
          .populate("category", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
      ]);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Products fetched successfully",
        data: products,
        pagination: {
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts,
          currentPage: page,
          limit,
        },
      });
    } catch (error) {
      logger.error(`Get admin products error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  getAdminProduct = async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findById(id).populate(
        "category",
        "name description",
      );

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Product fetched successfully",
        data: product,
      });
    } catch (error) {
      logger.error(`Get admin product error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  createProduct = async (req, res) => {
    try {
      const { title, description, price, category, isPublished } = req.body;

      if (!title || !description || price === undefined || !category) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Title, description, price and category are required",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "At least one product image is required",
        });
      }

      if (req.files.length > 3) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Maximum 3 images are allowed",
        });
      }

      const productPrice = Number(price);

      if (Number.isNaN(productPrice) || productPrice < 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Invalid product price",
        });
      }

      const categoryData = await Category.findById(category);

      if (!categoryData) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Category not found",
        });
      }

      const productSlug = slugify(title);

      const existingProduct = await Product.findOne({
        slug: productSlug,
      });

      if (existingProduct) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: "Product with this title already exists",
        });
      }

      const uploadedImages = [];

      for (const file of req.files) {
        // Multer memoryStorage provides file.buffer.
        const uploadedImage = await uploadToCloudinary(
          file.buffer,
          "role-auth/products",
        );

        uploadedImages.push(uploadedImage);
      }

      const product = await Product.create({
        title: title.trim(),
        slug: productSlug,
        description: description.trim(),
        price: productPrice,
        category: categoryData._id,
        images: uploadedImages,
        isPublished: isPublished === true || isPublished === "true",
      });

      const populatedProduct = await Product.findById(product._id).populate(
        "category",
        "name",
      );

      logger.info(`Product created: ${product.title}`);

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Product created successfully",
        data: populatedProduct,
      });
    } catch (error) {
      logger.error(`Create product error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  updateProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, price, category, isPublished } = req.body;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      if (title) {
        const newSlug = slugify(title);

        const existingProduct = await Product.findOne({
          slug: newSlug,
          _id: { $ne: id },
        });

        if (existingProduct) {
          return res.status(HTTP_STATUS.CONFLICT).json({
            success: false,
            message: "Product with this title already exists",
          });
        }

        product.title = title.trim();
        product.slug = newSlug;
      }

      if (description) {
        product.description = description.trim();
      }

      if (price !== undefined) {
        const productPrice = Number(price);

        if (Number.isNaN(productPrice) || productPrice < 0) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: "Invalid product price",
          });
        }

        product.price = productPrice;
      }

      if (category) {
        const categoryData = await Category.findById(category);

        if (!categoryData) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: "Category not found",
          });
        }

        product.category = categoryData._id;
      }

      if (isPublished !== undefined) {
        product.isPublished = isPublished === true || isPublished === "true";
      }

      if (req.files?.length) {
        if (req.files.length > 3) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: "Maximum 3 images are allowed",
          });
        }

        const oldImages = [...product.images];
        const uploadedImages = [];

        for (const file of req.files) {
          // Multer memoryStorage provides file.buffer.
          const uploadedImage = await uploadToCloudinary(
            file.buffer,
            "role-auth/products",
          );

          uploadedImages.push(uploadedImage);
        }

        product.images = uploadedImages;

        for (const image of oldImages) {
          if (image.publicId) {
            try {
              await deleteFromCloudinary(image.publicId);
            } catch (deleteError) {
              logger.error(
                `Old product image deletion failed: ${deleteError.message}`,
              );
            }
          }
        }
      }

      await product.save();

      const updatedProduct = await Product.findById(product._id).populate(
        "category",
        "name",
      );

      logger.info(`Product updated: ${product.title}`);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      logger.error(`Update product error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  togglePublish = async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      product.isPublished = !product.isPublished;

      await product.save();

      logger.info(
        `Product publish status changed: ${product.title} -> ${product.isPublished}`,
      );

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Product ${
          product.isPublished ? "published" : "unpublished"
        } successfully`,
        data: product,
      });
    } catch (error) {
      logger.error(`Toggle product publish error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };

  deleteProduct = async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      for (const image of product.images) {
        if (image.publicId) {
          try {
            await deleteFromCloudinary(image.publicId);
          } catch (deleteError) {
            logger.error(
              `Product image deletion failed: ${deleteError.message}`,
            );
          }
        }
      }

      await Product.findByIdAndDelete(id);

      logger.info(`Product deleted: ${product.title}`);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      logger.error(`Delete product error: ${error.message}`);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };
}

module.exports = new ProductController();
