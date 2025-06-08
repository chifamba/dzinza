"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logWarn = exports.logError = exports.logInfo = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
// Tell winston about our colors
winston_1.default.addColors(colors);
// Format for console output
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
// Format for file output
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.uncolorize(), winston_1.default.format.json());
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format: fileFormat,
    defaultMeta: { service: 'dzinza-backend' },
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
        }),
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});
// If we're not in production, log to the console with colorized output
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: consoleFormat
    }));
}
// Create logs directory if it doesn't exist
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
// Helper functions for different log levels
const logInfo = (message, meta) => {
    exports.logger.info(message, meta);
};
exports.logInfo = logInfo;
const logError = (message, error) => {
    if (error instanceof Error) {
        exports.logger.error(message, {
            error: error.message,
            stack: error.stack,
            ...error
        });
    }
    else {
        exports.logger.error(message, error);
    }
};
exports.logError = logError;
const logWarn = (message, meta) => {
    exports.logger.warn(message, meta);
};
exports.logWarn = logWarn;
const logDebug = (message, meta) => {
    exports.logger.debug(message, meta);
};
exports.logDebug = logDebug;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map