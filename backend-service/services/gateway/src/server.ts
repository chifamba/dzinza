import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import promMiddleware from "express-prometheus-middleware";

import { logger } from "@shared/utils/logger.js";
import { proxiedRequestsCounter } from "./utils/metrics.js";
import { serviceDiscovery } from "./config/services.js";
import { rateLimitConfig, authRateLimitConfig } from "./config/rateLimit.js";
import { swaggerConfig } from "./config/swagger.js";
import monitorRoutes from "./routes/monitor.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use("/api/auth", authRateLimitConfig);
app.use("/", rateLimitConfig);

// Prometheus metrics
app.use(
  promMiddleware({
    metricsPath: "/metrics",
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 5, 10],
  })
);

// Health check routes
app.use("/api/monitor", monitorRoutes);

// Swagger documentation
const specs = swaggerJSDoc(swaggerConfig);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Service discovery
const services = serviceDiscovery;

// Auth service proxy (public routes)
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: services.auth.url,
    changeOrigin: true,
    pathRewrite: {
      "^/api/auth": "",
    },
  })
);

// Protected routes (require authentication)
const protectedServices = [
  { path: "/api/genealogy", target: services.genealogy.url },
  { path: "/api/storage", target: services.storage.url },
  { path: "/api/search", target: services.search.url },
];

protectedServices.forEach(({ path, target }) => {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${path}`]: "",
      },
    })
  );
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "Dzinza API Gateway",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: Object.keys(services),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Gateway error:", err);
    res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
);

// Start server
app.listen(PORT, () => {
  logger.info(`Gateway server running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/monitor/health`);
  logger.info(`API documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`Metrics: http://localhost:${PORT}/metrics`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

export default app;
