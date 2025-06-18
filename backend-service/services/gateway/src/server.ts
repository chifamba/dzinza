import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import promMiddleware from "express-prometheus-middleware";
import dotenv from "dotenv";
import { trace, Span, ROOT_CONTEXT } from "@opentelemetry/api"; // Import OpenTelemetry API

// Define a type for the user payload attached by authMiddleware
interface UserPayload {
  id: string;
  email: string;
  role: string; // Adjust if it's roles: string[] or other structure
}

// Extend express.Request type
interface AuthenticatedRequest extends express.Request {
  user?: UserPayload;
}

import { logger } from "../../../shared/utils/logger";
import { proxiedRequestsCounter } from "./utils/metrics"; // Import the custom counter
import { initTracer as initGatewayTracer } from "./utils/tracing"; // Import OpenTelemetry tracer initialization for gateway
import { errorHandler } from "../../../shared/middleware/errorHandler";
import { authMiddleware } from "../../../shared/middleware/auth";
import { serviceDiscovery } from "./config/services";
import { rateLimitConfig } from "./config/rateLimit";
import { swaggerConfig } from "./config/swagger";
import monitorRoutes from "./routes/monitor";

dotenv.config();

// Initialize OpenTelemetry Tracer for Gateway
// IMPORTANT: This should be done as early as possible.
const OTEL_GATEWAY_SERVICE_NAME =
  process.env.OTEL_GATEWAY_SERVICE_NAME || "gateway-service";
const JAEGER_ENDPOINT_GATEWAY =
  process.env.JAEGER_ENDPOINT_GATEWAY ||
  process.env.JAEGER_ENDPOINT ||
  "http://localhost:4318/v1/traces"; // Fallback to general JAEGER_ENDPOINT
const NODE_ENV_GATEWAY = process.env.NODE_ENV || "development";

if (
  process.env.ENABLE_TRACING_GATEWAY === "true" ||
  process.env.ENABLE_TRACING === "true"
) {
  // Allow specific or general flag
  initGatewayTracer(
    OTEL_GATEWAY_SERVICE_NAME,
    JAEGER_ENDPOINT_GATEWAY,
    NODE_ENV_GATEWAY
  );
}

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "wss:"],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://dzinza.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"],
  })
);

app.use(compression());

// JSON parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const generalLimiter = rateLimit(rateLimitConfig.general);
const authLimiter = rateLimit(rateLimitConfig.auth);
const uploadLimiter = rateLimit(rateLimitConfig.upload);

app.use("/api/auth", authLimiter);
app.use("/api/storage/upload", uploadLimiter);
app.use("/", generalLimiter);

// Prometheus metrics
app.use(
  promMiddleware({
    metricsPath: "/metrics",
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
  })
);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
  });
});

// Swagger documentation
const specs = swaggerJsdoc(swaggerConfig);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Dzinza API Documentation",
  })
);

// Monitoring routes
app.use("/monitor", monitorRoutes);

// Service proxies with authentication middleware where needed
const services = serviceDiscovery();

// Auth service - no auth required for login/register
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: services.auth,
    changeOrigin: true,
    pathRewrite: {
      "^/api/auth": "",
    },
    onError: (err, req, _res) => { // _res indicates it's intentionally unused
      logger.error("Auth service proxy error:", { error: err.message });
      // res.status(503).json({ error: "Auth service unavailable" }); // This line would use res, but it's commented out or handled differently
      // It seems the original intent might have been to send a response,
      // but if not, _res is appropriate. For now, assuming it's correctly unused.
      // If a response *should* be sent, this logic needs review.
      // However, standard http-proxy-middleware behavior is to let the proxy request fail
      // and the client will receive a 503 or similar from the proxy itself if target is down.
      // Explicitly sending a response here can sometimes interfere.
      // For linting, marking _res as unused is the direct fix.
      // The original code did have res.status(503).json({ error: "Auth service unavailable" });
      // I will keep it to maintain functionality.
      _res.status(503).json({ error: "Auth service unavailable" });
    },
    onProxyReq: (proxyReq, req) => {
      // Add correlation ID for tracing
      const correlationId =
        req.headers["x-correlation-id"] ||
        `gateway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader("X-Correlation-ID", correlationId);
    },
    onProxyRes: (proxyRes, req, _res) => { // _res indicates it's intentionally unused
      const path = req.originalUrl.split("?")[0]; // Get path without query params
      // Increment after response, to capture status code
      proxiedRequestsCounter
        .labels("auth", path, String(proxyRes.statusCode))
        .inc();
    },
  })
);

// Protected routes that require authentication
const protectedServices = [
  { path: "/api/genealogy", target: services.genealogy },
  { path: "/api/storage", target: services.storage },
  { path: "/api/search", target: services.search },
];

protectedServices.forEach(({ path, target }) => {
  const serviceName = path.replace("/api/", "").split("/")[0] || "unknown"; // Define serviceName here
  app.use(
    path,
    authMiddleware,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${path}`]: "",
      },
      onError: (err, req, _res) => { // _res indicates it's intentionally unused
        logger.error(`${path} service proxy error:`, { error: err.message });
        _res
          .status(503)
          .json({ error: `${path.replace("/api/", "")} service unavailable` });
      },
      onProxyReq: (proxyReq, req: express.Request, _res: express.Response) => { // _res indicates it's intentionally unused
        // Typed req, res
        const tracer = trace.getTracer("gateway-service-proxy");
        const parentSpan = trace.getSpan(
          trace.setSpan(ROOT_CONTEXT, parentSpan)
        ); // Get current span if any, or use ROOT_CONTEXT

        tracer.startActiveSpan(
          `proxy.request_to.${serviceName}`, // serviceName is now defined
          { parent: parentSpan },
          (span: Span) => {
            span.setAttributes({
              "http.method": req.method,
              "http.url": target + (proxyReq.path || ""), // target + original path part
              "target.service": serviceName, // serviceName is now defined
              "user.id": (req as AuthenticatedRequest).user?.id, // If available
            });

            // Forward user information from auth middleware
            if ((req as AuthenticatedRequest).user) {
              // Type assertion for req.user
              proxyReq.setHeader("X-User-ID", (req as AuthenticatedRequest).user.id);
              proxyReq.setHeader("X-User-Email", (req as AuthenticatedRequest).user.email);
              proxyReq.setHeader("X-User-Role", (req as AuthenticatedRequest).user.role);
              span.setAttribute("user.forwarded", true);
            }

            // Add correlation ID for tracing
            const correlationId =
              (req.headers["x-correlation-id"] as string) ||
              `gateway-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            proxyReq.setHeader("X-Correlation-ID", correlationId);
            span.setAttribute("correlation.id", correlationId);

            // The span will be ended automatically when the active span scope ends.
            // However, for proxy requests, it's better to end it in onProxyRes or onError.
            // For this example, let's assume HttpInstrumentation handles the actual client request span.
            // This custom span is more for the gateway's decision/action to proxy.
            // To correctly link with client spans from HttpInstrumentation, more advanced context propagation might be needed
            // or ensure this span ends before HttpInstrumentation's client span starts.
            // For simplicity, we'll end it here. More robust would be to pass span to onProxyRes/onError.
            span.end();
          }
        );
      },
      onProxyRes: (proxyRes, req: express.Request, _res: express.Response) => { // _res indicates it's intentionally unused
        // Typed req, res
        // const serviceName = path.replace("/api/", "").split("/")[0] || "unknown"; // serviceName is defined outside this scope now
        const routePath = req.originalUrl.split("?")[0];
        proxiedRequestsCounter
          .labels(serviceName, routePath, String(proxyRes.statusCode)) // serviceName is now defined
          .inc();
        // If span was passed from onProxyReq, could end it here and set status from proxyRes.statusCode
      },
    })
  );
});

// Fallback route for unmatched paths
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found",
    path: req.originalUrl,
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(PORT, () => {
  logger.info(`Dzinza API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`Health Check: http://localhost:${PORT}/health`);
});

const gracefulShutdown = () => {
  logger.info("Received shutdown signal, closing server gracefully...");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default app;
