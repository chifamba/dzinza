"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.healthRoutes = void 0;
var express_1 = require("express");
var database_1 = require("../config/database");
var migrations_1 = require("../config/migrations");
var logger_1 = require("../shared/utils/logger");
var router = (0, express_1.Router)();
exports.healthRoutes = router;
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get("/", function (req, res) {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "dzinza-api-gateway",
        version: process.env.npm_package_version || "1.0.0",
    });
});
/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status
 *       503:
 *         description: One or more dependencies are unhealthy
 */
router.get("/detailed", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var healthStatus, overallHealthy, dbHealth, error_1, requiredEnvVars, missingEnvVars, migrationStatus, error_2, statusCode;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                healthStatus = {
                    status: "healthy",
                    timestamp: new Date().toISOString(),
                    service: "dzinza-api-gateway",
                    version: process.env.npm_package_version || "1.0.0",
                    dependencies: {},
                };
                overallHealthy = true;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, database_1.database.healthCheck()];
            case 2:
                dbHealth = _a.sent();
                healthStatus.dependencies.database = {
                    status: "healthy",
                    latency: dbHealth.latency,
                    timestamp: dbHealth.timestamp,
                };
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                overallHealthy = false;
                healthStatus.dependencies.database = {
                    status: "unhealthy",
                    error: error_1 instanceof Error ? error_1.message : "Database connection failed",
                };
                return [3 /*break*/, 4];
            case 4:
                requiredEnvVars = ["JWT_SECRET", "DB_HOST", "DB_NAME", "DB_USER"];
                missingEnvVars = requiredEnvVars.filter(function (varName) { return !process.env[varName]; });
                healthStatus.dependencies.environment = {
                    status: missingEnvVars.length === 0 ? "healthy" : "unhealthy",
                    missingVariables: missingEnvVars,
                };
                if (missingEnvVars.length > 0) {
                    overallHealthy = false;
                }
                _a.label = 5;
            case 5:
                _a.trys.push([5, 7, , 8]);
                return [4 /*yield*/, migrations_1.migrationRunner.getMigrationStatus()];
            case 6:
                migrationStatus = _a.sent();
                healthStatus.dependencies.migrations = __assign({ status: migrationStatus.pending === 0 ? "healthy" : "warning" }, migrationStatus);
                return [3 /*break*/, 8];
            case 7:
                error_2 = _a.sent();
                healthStatus.dependencies.migrations = {
                    status: "unhealthy",
                    error: error_2 instanceof Error ? error_2.message : "Migration check failed",
                };
                return [3 /*break*/, 8];
            case 8:
                // Set overall status
                healthStatus.status = overallHealthy ? "healthy" : "unhealthy";
                // Log health check
                logger_1.logger.info("Health check performed", {
                    service: "health",
                    status: healthStatus.status,
                    dependencies: Object.keys(healthStatus.dependencies).map(function (dep) { return ({
                        name: dep,
                        status: healthStatus.dependencies[dep].status,
                    }); }),
                });
                statusCode = overallHealthy ? 200 : 503;
                res.status(statusCode).json(healthStatus);
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /health/database:
 *   get:
 *     summary: Database-specific health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database is healthy
 *       503:
 *         description: Database is unhealthy
 */
router.get("/database", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dbHealth, tableCheckResult, tablesExist, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, database_1.database.healthCheck()];
            case 1:
                dbHealth = _a.sent();
                return [4 /*yield*/, database_1.database.query("\n      SELECT table_name \n      FROM information_schema.tables \n      WHERE table_schema = 'public' \n      AND table_name IN ('users', 'migrations')\n    ")];
            case 2:
                tableCheckResult = _a.sent();
                tablesExist = tableCheckResult.rows.map(function (row) { return row.table_name; });
                res.json({
                    status: "healthy",
                    database: __assign(__assign({}, dbHealth), { requiredTables: {
                            users: tablesExist.includes("users"),
                            migrations: tablesExist.includes("migrations"),
                        }, connectionPool: {
                            totalCount: database_1.database.getPool().totalCount,
                            idleCount: database_1.database.getPool().idleCount,
                            waitingCount: database_1.database.getPool().waitingCount,
                        } }),
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                logger_1.logger.error("Database health check failed:", error_3, { service: "health" });
                res.status(503).json({
                    status: "unhealthy",
                    database: {
                        error: error_3 instanceof Error
                            ? error_3.message
                            : "Database health check failed",
                    },
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /health/migrations:
 *   get:
 *     summary: Migration status check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Migration status retrieved
 */
router.get("/migrations", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var migrationStatus, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, migrations_1.migrationRunner.getMigrationStatus()];
            case 1:
                migrationStatus = _a.sent();
                res.json({
                    status: migrationStatus.pending === 0 ? "healthy" : "pending",
                    migrations: migrationStatus,
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                logger_1.logger.error("Migration status check failed:", error_4, {
                    service: "health",
                });
                res.status(503).json({
                    status: "unhealthy",
                    error: error_4 instanceof Error
                        ? error_4.message
                        : "Migration status check failed",
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
