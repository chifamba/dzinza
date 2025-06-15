"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRequest = exports.validateRequest = void 0;
var express_validator_1 = require("express-validator");
var logger_1 = require("../utils/logger");
/**
 * Middleware to validate request using express-validator
 * Should be used after validation chain
 */
var validateRequest = function (req, res, next) {
    var errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.logger.warn("Validation failed", {
            service: "validation",
            url: req.url,
            method: req.method,
            errors: errors.array(),
            ip: req.ip,
        });
        return res.status(400).json({
            error: "Validation Error",
            message: "Invalid request parameters",
            details: errors.array().map(function (err) { return ({
                field: err.type === "field" ? err.path : "unknown",
                message: err.msg,
                value: err.type === "field" ? err.value : undefined,
                location: err.type === "field" ? err.location : undefined,
            }); }),
        });
    }
    next();
};
exports.validateRequest = validateRequest;
/**
 * Middleware to sanitize request data
 */
var sanitizeRequest = function (req, res, next) {
    // Sanitize body
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body);
    }
    // Sanitize query parameters
    if (req.query && typeof req.query === "object") {
        req.query = sanitizeObject(req.query);
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
/**
 * Helper function to sanitize object properties
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(function (item) { return sanitizeObject(item); });
    }
    if (typeof obj === "object") {
        var sanitized = {};
        for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            // Skip prototype pollution attempts
            if (key === "__proto__" || key === "constructor" || key === "prototype") {
                continue;
            }
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
    }
    if (typeof obj === "string") {
        // Basic XSS protection - strip potentially dangerous content
        return obj
            .replace(/<script[^>]*>.*?<\/script>/gi, "")
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
            .replace(/javascript:/gi, "")
            .replace(/on\w+\s*=/gi, "");
    }
    return obj;
}
exports.default = exports.validateRequest;
