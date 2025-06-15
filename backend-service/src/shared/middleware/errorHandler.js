"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
var logger_1 = require("../utils/logger");
var errorHandler = function (err, req, res, next) {
    // Set default error values
    err.statusCode = err.statusCode || 500;
    err.isOperational = err.isOperational || false;
    // Log error
    logger_1.logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
    });
    // Development error response
    if (process.env.NODE_ENV === "development") {
        res.status(err.statusCode).json({
            status: "error",
            error: err,
            message: err.message,
            stack: err.stack,
        });
        return;
    }
    // Production error response
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: "error",
            message: err.message,
        });
    }
    else {
        res.status(500).json({
            status: "error",
            message: "Something went wrong!",
        });
    }
};
exports.errorHandler = errorHandler;
