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
exports.requirePermission = exports.requireRole = exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
var logger_1 = require("../utils/logger");
var authMiddleware = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, jwtSecret, decoded;
    return __generator(this, function (_a) {
        try {
            authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return [2 /*return*/, res.status(401).json({
                        error: "Unauthorized",
                        message: "Access token required",
                    })];
            }
            token = authHeader.substring(7);
            jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                logger_1.logger.error("JWT_SECRET not configured");
                return [2 /*return*/, res.status(500).json({
                        error: "Internal Server Error",
                        message: "Authentication configuration error",
                    })];
            }
            decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            // Validate token structure
            if (!decoded.id || !decoded.email) {
                return [2 /*return*/, res.status(401).json({
                        error: "Unauthorized",
                        message: "Invalid token structure",
                    })];
            }
            // Add user info to request
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role || "user",
                permissions: decoded.permissions || [],
            };
            // Log authentication success
            logger_1.logger.info("User authenticated successfully", {
                userId: req.user.id,
                email: req.user.email,
                endpoint: req.originalUrl,
                method: req.method,
            });
            next();
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return [2 /*return*/, res.status(401).json({
                        error: "Unauthorized",
                        message: "Token expired",
                    })];
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return [2 /*return*/, res.status(401).json({
                        error: "Unauthorized",
                        message: "Invalid token",
                    })];
            }
            logger_1.logger.error("Authentication error:", error);
            return [2 /*return*/, res.status(500).json({
                    error: "Internal Server Error",
                    message: "Authentication processing error",
                })];
        }
        return [2 /*return*/];
    });
}); };
exports.authMiddleware = authMiddleware;
var optionalAuthMiddleware = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader;
    return __generator(this, function (_a) {
        authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            return [2 /*return*/, (0, exports.authMiddleware)(req, res, next)];
        }
        next();
        return [2 /*return*/];
    });
}); };
exports.optionalAuthMiddleware = optionalAuthMiddleware;
var requireRole = function (requiredRoles) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authentication required",
            });
        }
        if (!requiredRoles.includes(req.user.role)) {
            logger_1.logger.warn("Access denied - insufficient role", {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: requiredRoles,
                endpoint: req.originalUrl,
            });
            return res.status(403).json({
                error: "Forbidden",
                message: "Insufficient permissions",
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
var requirePermission = function (requiredPermission) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authentication required",
            });
        }
        if (!req.user.permissions.includes(requiredPermission)) {
            logger_1.logger.warn("Access denied - missing permission", {
                userId: req.user.id,
                requiredPermission: requiredPermission,
                userPermissions: req.user.permissions,
                endpoint: req.originalUrl,
            });
            return res.status(403).json({
                error: "Forbidden",
                message: "Permission denied",
            });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
