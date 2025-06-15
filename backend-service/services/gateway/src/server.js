"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var http_proxy_middleware_1 = require("http-proxy-middleware");
var helmet_1 = require("helmet");
var cors_1 = require("cors");
var compression_1 = require("compression");
var express_rate_limit_1 = require("express-rate-limit");
var swagger_jsdoc_1 = require("swagger-jsdoc");
var swagger_ui_express_1 = require("swagger-ui-express");
var express_prometheus_middleware_1 = require("express-prometheus-middleware");
var dotenv_1 = require("dotenv");
var api_1 = require("@opentelemetry/api"); // Import OpenTelemetry API
var logger_1 = require("../../../shared/utils/logger");
var metrics_1 = require("./utils/metrics"); // Import the custom counter
var tracing_1 = require("./utils/tracing"); // Import OpenTelemetry tracer initialization for gateway
var errorHandler_1 = require("../../../shared/middleware/errorHandler");
var auth_1 = require("../../../shared/middleware/auth");
var services_1 = require("./config/services");
var rateLimit_1 = require("./config/rateLimit");
var swagger_1 = require("./config/swagger");
var monitor_1 = require("./routes/monitor");
dotenv_1.default.config();
// Initialize OpenTelemetry Tracer for Gateway
// IMPORTANT: This should be done as early as possible.
var OTEL_GATEWAY_SERVICE_NAME = process.env.OTEL_GATEWAY_SERVICE_NAME || 'gateway-service';
var JAEGER_ENDPOINT_GATEWAY = process.env.JAEGER_ENDPOINT_GATEWAY || process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces'; // Fallback to general JAEGER_ENDPOINT
var NODE_ENV_GATEWAY = process.env.NODE_ENV || 'development';
if (process.env.ENABLE_TRACING_GATEWAY === 'true' || process.env.ENABLE_TRACING === 'true') { // Allow specific or general flag
    (0, tracing_1.initTracer)(OTEL_GATEWAY_SERVICE_NAME, JAEGER_ENDPOINT_GATEWAY, NODE_ENV_GATEWAY);
}
var app = (0, express_1.default)();
var PORT = process.env.GATEWAY_PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)({
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
}));
app.use((0, cors_1.default)({
    origin: ((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://dzinza.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
}));
app.use((0, compression_1.default)());
// JSON parsing with size limits
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting
var generalLimiter = (0, express_rate_limit_1.default)(rateLimit_1.rateLimitConfig.general);
var authLimiter = (0, express_rate_limit_1.default)(rateLimit_1.rateLimitConfig.auth);
var uploadLimiter = (0, express_rate_limit_1.default)(rateLimit_1.rateLimitConfig.upload);
app.use('/api/auth', authLimiter);
app.use('/api/storage/upload', uploadLimiter);
app.use('/', generalLimiter);
// Prometheus metrics
app.use((0, express_prometheus_middleware_1.default)({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
}));
// Health check
app.get('/health', function (req, res) {
    res.status(200).json({
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
    });
});
// Swagger documentation
var specs = (0, swagger_jsdoc_1.default)(swagger_1.swaggerConfig);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Dzinza API Documentation'
}));
// Monitoring routes
app.use('/monitor', monitor_1.default);
// Service proxies with authentication middleware where needed
var services = (0, services_1.serviceDiscovery)();
// Auth service - no auth required for login/register
app.use('/api/auth', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: services.auth,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth': ''
    },
    onError: function (err, req, res) {
        logger_1.logger.error('Auth service proxy error:', { error: err.message });
        res.status(503).json({ error: 'Auth service unavailable' });
    },
    onProxyReq: function (proxyReq, req) {
        // Add correlation ID for tracing
        var correlationId = req.headers['x-correlation-id'] || "gateway-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
        proxyReq.setHeader('X-Correlation-ID', correlationId);
    },
    onProxyRes: function (proxyRes, req, res) {
        var path = req.originalUrl.split('?')[0]; // Get path without query params
        // Increment after response, to capture status code
        metrics_1.proxiedRequestsCounter.labels('auth', path, String(proxyRes.statusCode)).inc();
    }
}));
// Protected routes that require authentication
var protectedServices = [
    { path: '/api/genealogy', target: services.genealogy },
    { path: '/api/storage', target: services.storage },
    { path: '/api/search', target: services.search }
];
protectedServices.forEach(function (_a) {
    var _b;
    var path = _a.path, target = _a.target;
    app.use(path, auth_1.authMiddleware, (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: target,
        changeOrigin: true,
        pathRewrite: (_b = {},
            _b["^".concat(path)] = '',
            _b),
        onError: function (err, req, res) {
            logger_1.logger.error("".concat(path, " service proxy error:"), { error: err.message });
            res.status(503).json({ error: "".concat(path.replace('/api/', ''), " service unavailable") });
        },
        onProxyReq: function (proxyReq, req, res) {
            var tracer = api_1.trace.getTracer('gateway-service-proxy');
            var parentSpan = api_1.trace.getSpan(api_1.trace.setSpan(api_1.ROOT_CONTEXT, parentSpan)); // Get current span if any, or use ROOT_CONTEXT
            tracer.startActiveSpan("proxy.request_to.".concat(serviceName), { parent: parentSpan }, function (span) {
                var _a;
                span.setAttributes({
                    'http.method': req.method,
                    'http.url': target + (proxyReq.path || ''), // target + original path part
                    'target.service': serviceName,
                    'user.id': (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, // If available
                });
                // Forward user information from auth middleware
                if (req.user) { // Type assertion for req.user
                    proxyReq.setHeader('X-User-ID', req.user.id);
                    proxyReq.setHeader('X-User-Email', req.user.email);
                    proxyReq.setHeader('X-User-Role', req.user.role);
                    span.setAttribute('user.forwarded', true);
                }
                // Add correlation ID for tracing
                var correlationId = req.headers['x-correlation-id'] || "gateway-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
                proxyReq.setHeader('X-Correlation-ID', correlationId);
                span.setAttribute('correlation.id', correlationId);
                // The span will be ended automatically when the active span scope ends.
                // However, for proxy requests, it's better to end it in onProxyRes or onError.
                // For this example, let's assume HttpInstrumentation handles the actual client request span.
                // This custom span is more for the gateway's decision/action to proxy.
                // To correctly link with client spans from HttpInstrumentation, more advanced context propagation might be needed
                // or ensure this span ends before HttpInstrumentation's client span starts.
                // For simplicity, we'll end it here. More robust would be to pass span to onProxyRes/onError.
                span.end();
            });
        },
        onProxyRes: function (proxyRes, req, res) {
            var serviceName = path.replace('/api/', '').split('/')[0] || 'unknown';
            var routePath = req.originalUrl.split('?')[0];
            metrics_1.proxiedRequestsCounter.labels(serviceName, routePath, String(proxyRes.statusCode)).inc();
            // If span was passed from onProxyReq, could end it here and set status from proxyRes.statusCode
        }
    }));
});
// Fallback route for unmatched paths
app.use('*', function (req, res) {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.originalUrl
    });
});
// Error handling
app.use(errorHandler_1.errorHandler);
// Graceful shutdown
var server = app.listen(PORT, function () {
    logger_1.logger.info("Dzinza API Gateway running on port ".concat(PORT));
    logger_1.logger.info("Environment: ".concat(process.env.NODE_ENV));
    logger_1.logger.info("API Documentation: http://localhost:".concat(PORT, "/api-docs"));
    logger_1.logger.info("Health Check: http://localhost:".concat(PORT, "/health"));
});
var gracefulShutdown = function () {
    logger_1.logger.info('Received shutdown signal, closing server gracefully...');
    server.close(function () {
        logger_1.logger.info('HTTP server closed');
        process.exit(0);
    });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
exports.default = app;
