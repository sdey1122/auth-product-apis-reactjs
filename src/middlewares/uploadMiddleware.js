const multer = require("multer");

// Store uploaded files in memory instead of the local filesystem.
// This is suitable for serverless environments like Vercel.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, JPG, PNG, WEBP and GIF images are allowed.",
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter,
});

const uploadCategoryImage = upload.single("image");

const uploadProductImages = upload.array("images", 3);

module.exports = {
  uploadCategoryImage,
  uploadProductImages,
};
