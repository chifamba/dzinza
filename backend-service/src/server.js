"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables first
var dotenv_1 = require("dotenv");
var path_1 = require("path");
// Load root .env file first (shared configuration)
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
// Then load service-specific .env file (overrides)
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var morgan_1 = require("morgan");
var compression_1 = require("compression");
var express_rate_limit_1 = require("express-rate-limit");
var swagger_jsdoc_1 = require("swagger-jsdoc");
var swagger_ui_express_1 = require("swagger-ui-express");
var logger_1 = require("./shared/utils/logger");
var errorHandler_1 = require("./shared/middleware/errorHandler");
var metrics_1 = require("./shared/middleware/metrics");
var health_1 = require("./routes/health");
var auth_1 = require("./routes/auth");
var swagger_1 = require("./config/swagger");
var database_1 = require("./config/database");
var metrics_2 = require("./shared/middleware/metrics");
var tracing_1 = require("./utils/tracing"); // Import OpenTelemetry tracer initialization
// Initialize OpenTelemetry Tracer
// IMPORTANT: This should be done as early as possible in the application lifecycle.
var OTEL_SERVICE_NAME_BACKEND = process.env.OTEL_SERVICE_NAME || "backend-service";
var JAEGER_ENDPOINT_BACKEND = process.env.JAEGER_ENDPOINT || "http://localhost:4318/v1/traces";
var NODE_ENV_BACKEND = process.env.NODE_ENV || "development";
if (process.env.ENABLE_TRACING === "true") {
    (0, tracing_1.initTracer)(OTEL_SERVICE_NAME_BACKEND, JAEGER_ENDPOINT_BACKEND, NODE_ENV_BACKEND);
}
var app = (0, express_1.default)();
var PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)({
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
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: ((_a = process.env.CORS_ORIGIN) === null || _a === void 0 ? void 0 : _a.split(",")) || ["http://localhost:3000"],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
// Rate limiting
var limiter = (0, express_rate_limit_1.default)({
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
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((0, morgan_1.default)("combined", { stream: { write: function (msg) { return logger_1.logger.info(msg.trim()); } } }));
// Metrics middleware
app.use(metrics_1.metricsMiddleware);
// Swagger documentation
var specs = (0, swagger_jsdoc_1.default)(swagger_1.swaggerOptions);
app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Dzinza API Documentation",
}));
// Health check routes
app.use("/health", health_1.healthRoutes);
// Authentication routes (handled by gateway)
app.use("/api/auth", auth_1.authRoutes);
// Metrics endpoint
app.get("/metrics", metrics_2.getMetrics);
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
// 404 handler
app.use("*", function (req, res) {
    res.status(404).json({
        error: "Route not found",
        message: "Cannot ".concat(req.method, " ").concat(req.originalUrl),
    });
});
// Global error handler
app.use(errorHandler_1.errorHandler);
// Graceful shutdown
process.on("SIGTERM", function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.logger.info("SIGTERM received, shutting down gracefully");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, database_1.database.disconnect()];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                logger_1.logger.error("Error disconnecting from database during shutdown:", error_1);
                return [3 /*break*/, 4];
            case 4:
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
process.on("SIGINT", function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.logger.info("SIGINT received, shutting down gracefully");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, database_1.database.disconnect()];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                logger_1.logger.error("Error disconnecting from database during shutdown:", error_2);
                return [3 /*break*/, 4];
            case 4:
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
// Initialize server
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // Connect to database
                    return [4 /*yield*/, database_1.database.connect()];
                case 1:
                    // Connect to database
                    _a.sent();
                    logger_1.logger.info("Database connected successfully");
                    // Run migrations (commented out since Docker handles initialization)
                    // await migrationRunner.runMigrations();
                    logger_1.logger.info("Database initialization handled by Docker");
                    // Start server
                    app.listen(PORT, function () {
                        logger_1.logger.info("Dzinza API Gateway running on port ".concat(PORT));
                        logger_1.logger.info("Environment: ".concat(process.env.NODE_ENV));
                        logger_1.logger.info("API Documentation: http://localhost:".concat(PORT, "/api/docs"));
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    logger_1.logger.error("Failed to start server:", error_3);
                    process.exit(1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Start the server
startServer();
exports.default = app;
