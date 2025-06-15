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
exports.authRoutes = void 0;
var express_1 = require("express"); // Import Request, Response, NextFunction
var api_1 = require("@opentelemetry/api"); // Import OpenTelemetry API
var express_validator_1 = require("express-validator");
var bcryptjs_1 = require("bcryptjs");
var jsonwebtoken_1 = require("jsonwebtoken");
var uuid_1 = require("uuid");
var database_1 = require("../config/database");
var logger_1 = require("../shared/utils/logger");
var router = (0, express_1.Router)();
exports.authRoutes = router;
// JWT Configuration
var JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
var JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET ||
    "your-fallback-refresh-secret";
var JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
// Ensure JWT_SECRET is a string for TypeScript
if (!JWT_SECRET || typeof JWT_SECRET !== "string") {
    throw new Error("JWT_SECRET must be defined as a string");
}
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *                 minLength: 3
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post("/register", [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email is required"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("Password must be at least 8 characters with uppercase, lowercase, number, and special character"),
    (0, express_validator_1.body)("firstName")
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("First name is required and must be less than 50 characters"),
    (0, express_validator_1.body)("lastName")
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Last name is required and must be less than 50 characters"),
    (0, express_validator_1.body)("username")
        .trim()
        .isLength({ min: 3, max: 50 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Username must be 3-50 characters and contain only letters, numbers, and underscores"),
], function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var tracer;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                tracer = api_1.trace.getTracer("backend-service-auth-routes");
                return [4 /*yield*/, tracer.startActiveSpan("backend.auth.register.handler", function (span) { return __awaiter(void 0, void 0, void 0, function () {
                        var errors, _a, email, password, firstName, lastName, username, existingUserCheck, saltRounds, hashedPassword, userId, emailVerificationToken, result, user, accessToken, refreshToken, error_1, err;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 4, , 5]);
                                    errors = (0, express_validator_1.validationResult)(req);
                                    if (!errors.isEmpty()) {
                                        return [2 /*return*/, res.status(400).json({
                                                error: "Validation Error",
                                                details: errors.array(),
                                            })];
                                    }
                                    _a = req.body, email = _a.email, password = _a.password, firstName = _a.firstName, lastName = _a.lastName, username = _a.username;
                                    return [4 /*yield*/, database_1.database.query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username])];
                                case 1:
                                    existingUserCheck = _b.sent();
                                    if (existingUserCheck.rows.length > 0) {
                                        return [2 /*return*/, res.status(409).json({
                                                error: "Conflict",
                                                message: "Email or username already exists",
                                            })];
                                    }
                                    saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
                                    return [4 /*yield*/, bcryptjs_1.default.hash(password, saltRounds)];
                                case 2:
                                    hashedPassword = _b.sent();
                                    userId = (0, uuid_1.v4)();
                                    emailVerificationToken = (0, uuid_1.v4)();
                                    return [4 /*yield*/, database_1.database.query("\n      INSERT INTO users (\n        id, email, username, password_hash, first_name, last_name, \n        email_verification_token, email_verification_expires\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\n      RETURNING id, email, username, first_name, last_name, created_at\n    ", [
                                            userId,
                                            email,
                                            username,
                                            hashedPassword,
                                            firstName,
                                            lastName,
                                            emailVerificationToken,
                                            new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                                        ])];
                                case 3:
                                    result = _b.sent();
                                    user = result.rows[0];
                                    accessToken = jsonwebtoken_1.default.sign({
                                        userId: user.id,
                                        email: user.email,
                                        username: user.username,
                                    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
                                    refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, type: "refresh" }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
                                    logger_1.logger.info("User registered successfully", {
                                        service: "auth",
                                        userId: user.id,
                                        email: user.email,
                                        username: user.username,
                                    });
                                    return [2 /*return*/, res.status(201).json({
                                            message: "User registered successfully",
                                            user: {
                                                id: user.id,
                                                email: user.email,
                                                username: user.username,
                                                firstName: user.first_name,
                                                lastName: user.last_name,
                                                createdAt: user.created_at,
                                            },
                                            tokens: {
                                                accessToken: accessToken,
                                                refreshToken: refreshToken,
                                            },
                                        })];
                                case 4:
                                    error_1 = _b.sent();
                                    err = error_1;
                                    span.recordException(err);
                                    span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err.message });
                                    span.end();
                                    logger_1.logger.error("Registration failed:", err, { service: "auth" });
                                    next(err);
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); });
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or username
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post("/login", [
    (0, express_validator_1.body)("identifier")
        .trim()
        .isLength({ min: 1 })
        .withMessage("Email or username is required"),
    (0, express_validator_1.body)("password").isLength({ min: 1 }).withMessage("Password is required"),
], function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var tracer;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                tracer = api_1.trace.getTracer("backend-service-auth-routes");
                return [4 /*yield*/, tracer.startActiveSpan("backend.auth.login.handler", function (span) { return __awaiter(void 0, void 0, void 0, function () {
                        var errors, _a, identifier, password, userResult, user, isPasswordValid, newFailedAttempts, lockAccount, accessToken, refreshToken, error_2, err;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 6, , 7]);
                                    errors = (0, express_validator_1.validationResult)(req);
                                    if (!errors.isEmpty()) {
                                        return [2 /*return*/, res.status(400).json({
                                                error: "Validation Error",
                                                details: errors.array(),
                                            })];
                                    }
                                    _a = req.body, identifier = _a.identifier, password = _a.password;
                                    return [4 /*yield*/, database_1.database.query("\n      SELECT \n        id, email, username, password_hash, first_name, last_name,\n        failed_login_attempts, locked_until, is_active, last_login\n      FROM users \n      WHERE (email = $1 OR username = $1) AND is_active = true\n    ", [identifier])];
                                case 1:
                                    userResult = _b.sent();
                                    if (userResult.rows.length === 0) {
                                        return [2 /*return*/, res.status(401).json({
                                                error: "Authentication Failed",
                                                message: "Invalid credentials",
                                            })];
                                    }
                                    user = userResult.rows[0];
                                    // Check if account is locked
                                    if (user.locked_until && new Date() < new Date(user.locked_until)) {
                                        return [2 /*return*/, res.status(423).json({
                                                error: "Account Locked",
                                                message: "Account is temporarily locked due to multiple failed login attempts",
                                            })];
                                    }
                                    return [4 /*yield*/, bcryptjs_1.default.compare(password, user.password_hash)];
                                case 2:
                                    isPasswordValid = _b.sent();
                                    if (!!isPasswordValid) return [3 /*break*/, 4];
                                    newFailedAttempts = (user.failed_login_attempts || 0) + 1;
                                    lockAccount = newFailedAttempts >= 5;
                                    return [4 /*yield*/, database_1.database.query("\n        UPDATE users \n        SET failed_login_attempts = $1, locked_until = $2\n        WHERE id = $3\n      ", [
                                            newFailedAttempts,
                                            lockAccount ? new Date(Date.now() + 30 * 60 * 1000) : null, // Lock for 30 minutes
                                            user.id,
                                        ])];
                                case 3:
                                    _b.sent();
                                    return [2 /*return*/, res.status(401).json({
                                            error: "Authentication Failed",
                                            message: "Invalid credentials",
                                        })];
                                case 4: 
                                // Reset failed login attempts and update last login
                                return [4 /*yield*/, database_1.database.query("\n      UPDATE users \n      SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP\n      WHERE id = $1\n    ", [user.id])];
                                case 5:
                                    // Reset failed login attempts and update last login
                                    _b.sent();
                                    accessToken = jsonwebtoken_1.default.sign({
                                        userId: user.id,
                                        email: user.email,
                                        username: user.username,
                                    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
                                    refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, type: "refresh" }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
                                    logger_1.logger.info("User logged in successfully", {
                                        service: "auth",
                                        userId: user.id,
                                        email: user.email,
                                        username: user.username,
                                    });
                                    return [2 /*return*/, res.json({
                                            message: "Login successful",
                                            user: {
                                                id: user.id,
                                                email: user.email,
                                                username: user.username,
                                                firstName: user.first_name,
                                                lastName: user.last_name,
                                                lastLogin: user.last_login,
                                            },
                                            tokens: {
                                                accessToken: accessToken,
                                                refreshToken: refreshToken,
                                            },
                                        })];
                                case 6:
                                    error_2 = _b.sent();
                                    err = error_2;
                                    span.recordException(err);
                                    span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err.message });
                                    span.end();
                                    logger_1.logger.error("Login failed:", err, { service: "auth" });
                                    next(err);
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); });
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var refreshToken, decoded, userResult, user, accessToken, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                refreshToken = req.body.refreshToken;
                if (!refreshToken) {
                    return [2 /*return*/, res.status(401).json({
                            error: "Authentication Failed",
                            message: "Refresh token is required",
                        })];
                }
                decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_SECRET);
                if (decoded.type !== "refresh") {
                    return [2 /*return*/, res.status(401).json({
                            error: "Authentication Failed",
                            message: "Invalid token type",
                        })];
                }
                return [4 /*yield*/, database_1.database.query("\n      SELECT id, email, username, is_active\n      FROM users \n      WHERE id = $1 AND is_active = true\n    ", [decoded.userId])];
            case 1:
                userResult = _a.sent();
                if (userResult.rows.length === 0) {
                    return [2 /*return*/, res.status(401).json({
                            error: "Authentication Failed",
                            message: "User not found or inactive",
                        })];
                }
                user = userResult.rows[0];
                accessToken = jsonwebtoken_1.default.sign({
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
                logger_1.logger.info("Token refreshed successfully", {
                    service: "auth",
                    userId: user.id,
                });
                return [2 /*return*/, res.json({
                        message: "Token refreshed successfully",
                        tokens: {
                            accessToken: accessToken,
                        },
                    })];
            case 2:
                error_3 = _a.sent();
                if (error_3 instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                    return [2 /*return*/, res.status(401).json({
                            error: "Authentication Failed",
                            message: "Invalid refresh token",
                        })];
                }
                logger_1.logger.error("Token refresh failed:", error_3, { service: "auth" });
                next(error_3);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get("/me", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, decoded, userResult, user, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith("Bearer ")) {
                    return [2 /*return*/, res.status(401).json({
                            error: "Authentication Failed",
                            message: "Authorization header is required",
                        })];
                }
                token = authHeader.substring(7);
                decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                return [4 /*yield*/, database_1.database.query("\n      SELECT \n        id, email, username, first_name, last_name, phone, date_of_birth,\n        gender, profile_picture_url, bio, location, language, timezone,\n        email_verified, two_factor_enabled, subscription_tier, last_login, created_at\n      FROM users \n      WHERE id = $1 AND is_active = true\n    ", [decoded.userId])];
            case 1:
                userResult = _a.sent();
                if (userResult.rows.length === 0) {
                    return [2 /*return*/, res.status(401).json({
                            error: "Authentication Failed",
                            message: "User not found or inactive",
                        })];
                }
                user = userResult.rows[0];
                return [2 /*return*/, res.json({
                        user: {
                            id: user.id,
                            email: user.email,
                            username: user.username,
                            firstName: user.first_name,
                            lastName: user.last_name,
                            phone: user.phone,
                            dateOfBirth: user.date_of_birth,
                            gender: user.gender,
                            profilePictureUrl: user.profile_picture_url,
                            bio: user.bio,
                            location: user.location,
                            language: user.language,
                            timezone: user.timezone,
                            emailVerified: user.email_verified,
                            twoFactorEnabled: user.two_factor_enabled,
                            subscriptionTier: user.subscription_tier,
                            lastLogin: user.last_login,
                            createdAt: user.created_at,
                        },
                    })];
            case 2:
                error_4 = _a.sent();
                if (error_4 instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                    return [2 /*return*/, res.status(401).json({
                            error: "Authentication Failed",
                            message: "Invalid access token",
                        })];
                }
                logger_1.logger.error("Get user profile failed:", error_4, { service: "auth" });
                next(error_4);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
