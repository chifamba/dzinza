// Load environment variables first
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load root .env file first (shared configuration)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// Then load service-specific .env file (overrides)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { logger } from "./shared/utils/logger";
import { errorHandler } from "./shared/middleware/errorHandler";
import { metricsMiddleware } from "./shared/middleware/metrics";
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { genealogyRoutes } from "./routes/genealogy";
import { createProxyMiddleware } from "http-proxy-middleware";
import { swaggerOptions } from "./config/swagger";
import { database } from "./config/database";
import { getMetrics } from "./shared/middleware/metrics";
import { initTracer } from "./utils/tracing"; // Import OpenTelemetry tracer initialization

// Initialize OpenTelemetry Tracer
// IMPORTANT: This should be done as early as possible in the application lifecycle.
const OTEL_SERVICE_NAME_BACKEND =
  process.env.OTEL_SERVICE_NAME || "backend-service";
const JAEGER_ENDPOINT_BACKEND =
  process.env.JAEGER_ENDPOINT || "http://localhost:4318/v1/traces";
const NODE_ENV_BACKEND = process.env.NODE_ENV || "development";

if (process.env.ENABLE_TRACING === "true") {
  initTracer(
    OTEL_SERVICE_NAME_BACKEND,
    JAEGER_ENDPOINT_BACKEND,
    NODE_ENV_BACKEND
  );
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.dzinza.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT || "100"),
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// General middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } })
);

// Metrics middleware
app.use(metricsMiddleware);

// Swagger documentation
const specs = swaggerJsdoc(swaggerOptions);
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Dzinza API Documentation",
  })
);

// Health check routes
app.use("/health", healthRoutes);

// Authentication routes (handled by gateway)
app.use("/api/auth", authRoutes);

// Genealogy routes
app.use("/api/genealogy", genealogyRoutes);

// Notification routes
app.use(
  "/api/notifications",
  createProxyMiddleware({
    target:
      process.env.NODE_ENV === "production"
        ? "http://genealogy-service:3004"
        : "http://localhost:3004",
    changeOrigin: true,
    pathRewrite: { "^/api/notifications": "/notifications" },
    onError: (err, req, res) => {
      logger.error("Genealogy notification service proxy error:", err);
      res
        .status(503)
        .json({ error: "Genealogy notification service unavailable" });
    },
  })
);

// Metrics endpoint
app.get("/metrics", getMetrics);

// For now, comment out microservice proxies until services are ready
// TODO: Uncomment when microservices are implemented
/*
// Microservice proxies with authentication
app.use('/api/genealogy',
  authMiddleware,
  createProxyMiddleware({
    target: 'http://genealogy-service:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/genealogy': '' },
    onError: (err, req, res) => {
      logger.error('Genealogy service proxy error:', err);
      res.status(503).json({ error: 'Genealogy service unavailable' });
    }
  })
);

app.use('/api/search',
  authMiddleware,
  createProxyMiddleware({
    target: 'http://search-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/search': '' },
    onError: (err, req, res) => {
      logger.error('Search service proxy error:', err);
      res.status(503).json({ error: 'Search service unavailable' });
    }
  })
);

app.use('/api/storage',
  authMiddleware,
  createProxyMiddleware({
    target: 'http://storage-service:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/storage': '' },
    onError: (err, req, res) => {
      logger.error('Storage service proxy error:', err);
      res.status(503).json({ error: 'Storage service unavailable' });
    }
  })
);
*/

// API endpoints that are not yet implemented
app.use("/api/*", (req, res) => {
  logger.warn(`API endpoint not implemented: ${req.method} ${req.originalUrl}`);
  res.status(501).json({
    error: "Not Implemented",
    message: `API endpoint ${req.method} ${req.originalUrl} is not yet implemented`,
    note: "This endpoint is planned for future implementation",
  });
});

// 404 handler for non-API routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  try {
    await database.disconnect();
  } catch (error) {
    logger.error("Error disconnecting from database during shutdown:", error);
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  try {
    await database.disconnect();
  } catch (error) {
    logger.error("Error disconnecting from database during shutdown:", error);
  }
  process.exit(0);
});

// Initialize server
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    logger.info("Database connected successfully");

    // Run migrations (commented out since Docker handles initialization)
    // await migrationRunner.runMigrations();
    logger.info("Database initialization handled by Docker");

    // Start server
    app.listen(PORT, () => {
      logger.info(`Dzinza API Gateway running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
