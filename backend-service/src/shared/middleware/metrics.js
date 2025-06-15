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
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.getMetricsSnapshot = exports.recordDatabaseQuery = exports.updateDatabaseMetrics = exports.getMetrics = exports.metricsMiddleware = exports.userProfileRequestsCounter = exports.databaseQueryDuration = exports.databaseConnectionsActive = exports.activeConnections = exports.httpRequestsTotal = exports.httpRequestDuration = void 0;
var prom_client_1 = require("prom-client");
var logger_1 = require("../utils/logger");
// Create a Registry
var register = new prom_client_1.default.Registry();
exports.register = register;
// Add default metrics (CPU, memory, etc.) with a service-specific prefix
prom_client_1.default.collectDefaultMetrics({ register: register, prefix: "backend_service_" });
// Custom metrics
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: "backend_service_http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds for the backend service",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.5, 1, 2, 5, 10], // Consider standardizing buckets across services or using default
});
exports.httpRequestsTotal = new prom_client_1.default.Counter({
    name: "backend_service_http_requests_total",
    help: "Total number of HTTP requests for the backend service",
    labelNames: ["method", "route", "status_code"],
});
exports.activeConnections = new prom_client_1.default.Gauge({
    name: "backend_service_http_active_connections",
    help: "Number of active HTTP connections for the backend service",
});
exports.databaseConnectionsActive = new prom_client_1.default.Gauge({
    name: "backend_service_database_connections_active",
    help: "Number of active database connections for the backend service",
});
exports.databaseQueryDuration = new prom_client_1.default.Histogram({
    name: "backend_service_database_query_duration_seconds",
    help: "Duration of database queries in seconds for the backend service",
    labelNames: ["operation", "table"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
// --- New service-specific metrics for backend-service ---
exports.userProfileRequestsCounter = new prom_client_1.default.Counter({
    name: "backend_service_user_profile_requests_total",
    help: "Total number of user profile requests processed by backend-service",
    labelNames: ["profile_type"], // e.g., 'full', 'summary'
});
// Register metrics (prom-client typically auto-registers metrics defined with a 'name' unless `register` option is explicitly passed to constructor)
// However, explicit registration is fine too. Let's ensure all are covered.
// No need to call register.registerMetric(metric) if it's already associated with 'register' in its constructor,
// or if 'prom-client.register' (default global registry) is used and 'register' is that default.
// Here, 'register' is a new client.Registry(), so metrics need to be associated with it.
// The current code does not pass `registers: [register]` to constructors, so explicit registration is needed.
// For consistency and clarity, I'll add `registers: [register]` to each metric constructor
// and remove the explicit `register.registerMetric` calls.
// Updated metric definitions with explicit registration:
// (Re-declaring them here to show the change, actual code would modify existing ones)
// const httpRequestDuration = new client.Histogram({
//   name: 'backend_service_http_request_duration_seconds',
//   help: 'Duration of HTTP requests in seconds for the backend service',
//   labelNames: ['method', 'route', 'status_code'],
//   buckets: [0.1, 0.5, 1, 2, 5, 10],
//   registers: [register] // Added
// });
// ... and so on for all metrics. I will apply this pattern in the actual diff.
// The original code had explicit register.registerMetric() calls, which is fine.
// I will keep that pattern and just add the new metric to it.
register.registerMetric(exports.httpRequestDuration);
register.registerMetric(exports.httpRequestsTotal);
register.registerMetric(exports.activeConnections);
register.registerMetric(exports.databaseConnectionsActive);
register.registerMetric(exports.databaseQueryDuration);
register.registerMetric(exports.userProfileRequestsCounter); // Register the new metric
/**
 * Middleware to collect HTTP metrics
 */
var metricsMiddleware = function (req, res, next) {
    var start = Date.now();
    // Increment active connections
    exports.activeConnections.inc();
    // Override res.end to capture metrics when response is sent
    var originalEnd = res.end;
    res.end = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var duration = (Date.now() - start) / 1000;
        var route = ((_a = req.route) === null || _a === void 0 ? void 0 : _a.path) || req.path || "unknown";
        var method = req.method;
        var statusCode = res.statusCode.toString();
        // Record metrics
        exports.httpRequestDuration.labels(method, route, statusCode).observe(duration);
        exports.httpRequestsTotal.labels(method, route, statusCode).inc();
        // Decrement active connections
        exports.activeConnections.dec();
        // Log performance metrics
        logger_1.logger.debug("HTTP request completed", {
            service: "metrics",
            method: method,
            route: route,
            statusCode: statusCode,
            duration: "".concat(duration, "s"),
            ip: req.ip,
            userAgent: req.get("User-Agent"),
        });
        // Call original end method
        return originalEnd.apply(this, args);
    };
    next();
};
exports.metricsMiddleware = metricsMiddleware;
/**
 * Route to expose Prometheus metrics
 */
var getMetrics = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var metrics, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                res.set("Content-Type", register.contentType);
                return [4 /*yield*/, register.metrics()];
            case 1:
                metrics = _a.sent();
                res.end(metrics);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                logger_1.logger.error("Error generating metrics:", error_1, { service: "metrics" });
                res.status(500).json({ error: "Failed to generate metrics" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getMetrics = getMetrics;
/**
 * Update database connection metrics
 */
var updateDatabaseMetrics = function (activeConnections) {
    exports.databaseConnectionsActive.set(activeConnections);
};
exports.updateDatabaseMetrics = updateDatabaseMetrics;
/**
 * Record database query metrics
 */
var recordDatabaseQuery = function (operation, table, duration) {
    exports.databaseQueryDuration.labels(operation, table).observe(duration / 1000); // Convert ms to seconds
};
exports.recordDatabaseQuery = recordDatabaseQuery;
/**
 * Get current metrics values for health checks
 */
var getMetricsSnapshot = function () { return __awaiter(void 0, void 0, void 0, function () {
    var metrics, snapshot_1, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, register.getMetricsAsJSON()];
            case 1:
                metrics = _a.sent();
                snapshot_1 = {
                    httpRequestsTotal: 0,
                    activeConnections: 0,
                    databaseConnectionsActive: 0,
                    averageResponseTime: 0,
                };
                metrics.forEach(function (metric) {
                    var _a, _b, _c, _d;
                    switch (metric.name) {
                        case "http_requests_total":
                            snapshot_1.httpRequestsTotal = metric.values.reduce(function (sum, val) { return sum + val.value; }, 0);
                            break;
                        case "http_active_connections":
                            snapshot_1.activeConnections = ((_a = metric.values[0]) === null || _a === void 0 ? void 0 : _a.value) || 0;
                            break;
                        case "database_connections_active":
                            snapshot_1.databaseConnectionsActive = ((_b = metric.values[0]) === null || _b === void 0 ? void 0 : _b.value) || 0;
                            break;
                        case "http_request_duration_seconds":
                            // Calculate average from histogram
                            if (metric.values.length > 0) {
                                var sum = ((_c = metric.values.find(function (v) { return v.labels.quantile === undefined; })) === null || _c === void 0 ? void 0 : _c.value) || 0;
                                var count = ((_d = metric.values.find(function (v) { var _a; return (_a = v.metricName) === null || _a === void 0 ? void 0 : _a.endsWith("_count"); })) === null || _d === void 0 ? void 0 : _d.value) || 1;
                                snapshot_1.averageResponseTime = sum / count;
                            }
                            break;
                    }
                });
                return [2 /*return*/, snapshot_1];
            case 2:
                error_2 = _a.sent();
                logger_1.logger.error("Error getting metrics snapshot:", error_2, {
                    service: "metrics",
                });
                return [2 /*return*/, null];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getMetricsSnapshot = getMetricsSnapshot;
exports.default = exports.metricsMiddleware;
