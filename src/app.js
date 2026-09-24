const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const routes = require("./routes/index");
const logger = require("./utils/logger");

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:6899",
      "https://auth-product-apis-reactjs.onrender.com",
      "https://auth-product-apis-reactjs.vercel.app",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Role Based Authentication System API is running",
  });
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
);

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  logger.error(`Unhandled server error: ${error.message}`);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;
