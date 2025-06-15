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
exports.database = void 0;
var pg_1 = require("pg");
var mongoose_1 = require("mongoose");
var logger_1 = require("../shared/utils/logger");
// PostgreSQL configuration
var pgPool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'dzinza',
    user: process.env.DB_USER || 'dzinza_user',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// MongoDB configuration
var initMongoDB = function () { return __awaiter(void 0, void 0, void 0, function () {
    var mongoUrl, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/dzinza';
                return [4 /*yield*/, mongoose_1.default.connect(mongoUrl)];
            case 1:
                _a.sent();
                logger_1.logger.info('Connected to MongoDB');
                return [2 /*return*/, mongoose_1.default];
            case 2:
                error_1 = _a.sent();
                logger_1.logger.error('Failed to connect to MongoDB:', error_1);
                throw error_1;
            case 3: return [2 /*return*/];
        }
    });
}); };
// Database connection manager
var connectToDatabase = function () { return __awaiter(void 0, void 0, void 0, function () {
    var pgClient, mongodb, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, pgPool.connect()];
            case 1:
                pgClient = _a.sent();
                logger_1.logger.info('Connected to PostgreSQL');
                pgClient.release();
                return [4 /*yield*/, initMongoDB()];
            case 2:
                mongodb = _a.sent();
                return [2 /*return*/, {
                        postgres: pgPool,
                        mongodb: mongodb
                    }];
            case 3:
                error_2 = _a.sent();
                logger_1.logger.error('Database initialization failed:', error_2);
                throw error_2;
            case 4: return [2 /*return*/];
        }
    });
}); };
var disconnectFromDatabase = function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, pgPool.end()];
            case 1:
                _a.sent();
                return [4 /*yield*/, mongoose_1.default.disconnect()];
            case 2:
                _a.sent();
                logger_1.logger.info('Disconnected from all databases');
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                logger_1.logger.error('Error during database disconnection:', error_3);
                throw error_3;
            case 4: return [2 /*return*/];
        }
    });
}); };
// Database query method
var query = function (text, params) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pgPool.query(text, params)];
            case 1:
                result = _a.sent();
                return [2 /*return*/, result];
            case 2:
                error_4 = _a.sent();
                logger_1.logger.error('Database query error:', error_4);
                throw error_4;
            case 3: return [2 /*return*/];
        }
    });
}); };
// Database transaction method
var transaction = function (callback) { return __awaiter(void 0, void 0, void 0, function () {
    var client, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, pgPool.connect()];
            case 1:
                client = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 6, 8, 9]);
                return [4 /*yield*/, client.query('BEGIN')];
            case 3:
                _a.sent();
                return [4 /*yield*/, callback(client)];
            case 4:
                _a.sent();
                return [4 /*yield*/, client.query('COMMIT')];
            case 5:
                _a.sent();
                return [3 /*break*/, 9];
            case 6:
                error_5 = _a.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 7:
                _a.sent();
                throw error_5;
            case 8:
                client.release();
                return [7 /*endfinally*/];
            case 9: return [2 /*return*/];
        }
    });
}); };
// Health check method
var healthCheck = function () { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, client, latency, error_6, latency;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                startTime = Date.now();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, pgPool.connect()];
            case 2:
                client = _a.sent();
                return [4 /*yield*/, client.query('SELECT 1')];
            case 3:
                _a.sent();
                client.release();
                latency = Date.now() - startTime;
                return [2 /*return*/, {
                        status: 'connected',
                        latency: latency,
                        timestamp: new Date().toISOString()
                    }];
            case 4:
                error_6 = _a.sent();
                latency = Date.now() - startTime;
                return [2 /*return*/, {
                        status: 'error',
                        latency: latency,
                        timestamp: new Date().toISOString(),
                        error: error_6 instanceof Error ? error_6.message : 'Unknown error'
                    }];
            case 5: return [2 /*return*/];
        }
    });
}); };
// Get pool information
var getPool = function () { return ({
    totalCount: pgPool.totalCount,
    idleCount: pgPool.idleCount,
    waitingCount: pgPool.waitingCount
}); };
exports.database = {
    postgres: pgPool,
    mongodb: mongoose_1.default,
    initialize: connectToDatabase,
    connect: connectToDatabase,
    disconnect: disconnectFromDatabase,
    query: query,
    transaction: transaction,
    healthCheck: healthCheck,
    getPool: getPool
};
