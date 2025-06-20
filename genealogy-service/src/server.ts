import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import dotenv from "dotenv";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
// promClient removed, will use registry from our metrics utility
// import promClient from "prom-client";
import metricsRegistry, {
  httpRequestCounter,
  httpRequestDurationMicroseconds,
} from "./utils/metrics"; // Import our metrics setup
import { initTracer } from "./utils/tracing"; // Import OpenTelemetry tracer initialization

// Import routes
import familyTreeRoutes from "./routes/familyTree.js";
import personRoutes from "./routes/personRoutes.js";
import relationshipRoutes from "./routes/relationshipRoutes.js";
// TODO: Create these route files
// import mediaRoutes from "./routes/media.js";
// import eventsRouter from "./routes/events.js";

// Import middleware
import { errorHandler } from "../../src/shared/middleware/errorHandler.js";
import { authMiddleware } from "../../src/shared/middleware/auth.js";
import { logger } from "../../src/shared/utils/logger.js";

dotenv.config();

// Initialize OpenTelemetry Tracer
const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "genealogy-service";
const JAEGER_ENDPOINT =
  process.env.JAEGER_ENDPOINT || "http://localhost:4318/v1/traces";
const NODE_ENV = process.env.NODE_ENV || "development";

if (process.env.ENABLE_TRACING === "true") {
  initTracer(OTEL_SERVICE_NAME, JAEGER_ENDPOINT, NODE_ENV);
}

const app = express();
const PORT = process.env.GENEALOGY_PORT || 3004;

// Enable trust proxy for accurate IP addresses
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"],
  })
);

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Metrics middleware (using imported metrics)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const durationSeconds = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || "unknown_route";
    const statusCode = res.statusCode.toString();

    httpRequestDurationMicroseconds
      .labels(req.method, route, statusCode) // Use 'code' as label name if that's what histogram expects, or change histogram
      .observe(durationSeconds);

    httpRequestCounter.labels(req.method, route, statusCode).inc();
  });
  next();
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Dzinza Genealogy Service API",
      version: "1.0.0",
      description: "API for managing family trees, persons, and relationships",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/models/*.ts"],
};

const specs = swaggerJsdoc(swaggerOptions);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "genealogy-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Metrics endpoint (using imported registry)
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to serve metrics:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).send(error.message);
  }
});

// API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// API routes (all routes require authentication)
app.use("/api/family-trees", authMiddleware, familyTreeRoutes);
app.use("/api/persons", authMiddleware, personRoutes);
app.use("/api/relationships", authMiddleware, relationshipRoutes);
// TODO: Implement these routes
// app.use("/api/media", authMiddleware, mediaRoutes);
// app.use("/api/events", authMiddleware, eventsRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/dzinza_genealogy";
    await mongoose.connect(mongoUri);
    logger.info("MongoDB connected successfully", { service: "genealogy" });
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Graceful shutdown...`, {
    service: "genealogy",
  });

  mongoose.connection.close(() => {
    logger.info("MongoDB connection closed", { service: "genealogy" });
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Genealogy service running on port ${PORT}`, {
        service: "genealogy",
        port: PORT,
        environment: process.env.NODE_ENV || "development",
      });
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
