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
exports.migrationRunner = exports.MigrationRunner = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var database_1 = require("./database");
var logger_1 = require("../shared/utils/logger");
var MigrationRunner = /** @class */ (function () {
    function MigrationRunner(migrationsPath) {
        if (migrationsPath === void 0) { migrationsPath = (0, path_1.join)(__dirname, "../../../../database/init"); }
        this.migrationsPath = migrationsPath;
    }
    MigrationRunner.prototype.ensureMigrationsTable = function () {
        return __awaiter(this, void 0, void 0, function () {
            var createTableQuery, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        createTableQuery = "\n      CREATE TABLE IF NOT EXISTS migrations (\n        id VARCHAR(255) PRIMARY KEY,\n        name VARCHAR(255) NOT NULL,\n        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n      );\n    ";
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, database_1.database.query(createTableQuery)];
                    case 2:
                        _a.sent();
                        logger_1.logger.info("Migrations table ready", { service: "migrations" });
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error("Failed to create migrations table:", error_1, {
                            service: "migrations",
                        });
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MigrationRunner.prototype.getExecutedMigrations = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_1.database.query("SELECT id FROM migrations ORDER BY executed_at ASC")];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows.map(function (row) { return row.id; })];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error("Failed to get executed migrations:", error_2, {
                            service: "migrations",
                        });
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MigrationRunner.prototype.loadMigrationFiles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, migrations, _i, files_1, file, filePath, sql, id;
            return __generator(this, function (_a) {
                try {
                    files = (0, fs_1.readdirSync)(this.migrationsPath)
                        .filter(function (file) { return file.endsWith(".sql"); })
                        .sort();
                    migrations = [];
                    for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                        file = files_1[_i];
                        filePath = (0, path_1.join)(this.migrationsPath, file);
                        sql = (0, fs_1.readFileSync)(filePath, "utf8");
                        id = file.replace(".sql", "");
                        migrations.push({
                            id: id,
                            name: file,
                            sql: sql,
                            timestamp: new Date(),
                        });
                    }
                    logger_1.logger.info("Loaded ".concat(migrations.length, " migration files"), {
                        service: "migrations",
                        files: migrations.map(function (m) { return m.name; }),
                    });
                    return [2 /*return*/, migrations];
                }
                catch (error) {
                    logger_1.logger.error("Failed to load migration files:", error, {
                        service: "migrations",
                    });
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    MigrationRunner.prototype.executeMigration = function (migration) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_1.database.transaction(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: 
                                        // Execute the migration SQL
                                        return [4 /*yield*/, client.query(migration.sql)];
                                        case 1:
                                            // Execute the migration SQL
                                            _a.sent();
                                            // Record the migration as executed
                                            return [4 /*yield*/, client.query("INSERT INTO migrations (id, name) VALUES ($1, $2)", [migration.id, migration.name])];
                                        case 2:
                                            // Record the migration as executed
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        logger_1.logger.info("Migration executed successfully: ".concat(migration.name), {
                            service: "migrations",
                            migrationId: migration.id,
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error("Failed to execute migration: ".concat(migration.name), error_3, {
                            service: "migrations",
                            migrationId: migration.id,
                        });
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MigrationRunner.prototype.runMigrations = function () {
        return __awaiter(this, void 0, void 0, function () {
            var executedMigrations_1, allMigrations, pendingMigrations, _i, pendingMigrations_1, migration, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        logger_1.logger.info("Starting database migrations", { service: "migrations" });
                        // Ensure migrations table exists
                        return [4 /*yield*/, this.ensureMigrationsTable()];
                    case 1:
                        // Ensure migrations table exists
                        _a.sent();
                        return [4 /*yield*/, this.getExecutedMigrations()];
                    case 2:
                        executedMigrations_1 = _a.sent();
                        logger_1.logger.info("Found ".concat(executedMigrations_1.length, " executed migrations"), {
                            service: "migrations",
                            executed: executedMigrations_1,
                        });
                        return [4 /*yield*/, this.loadMigrationFiles()];
                    case 3:
                        allMigrations = _a.sent();
                        pendingMigrations = allMigrations.filter(function (migration) { return !executedMigrations_1.includes(migration.id); });
                        if (pendingMigrations.length === 0) {
                            logger_1.logger.info("No pending migrations", { service: "migrations" });
                            return [2 /*return*/];
                        }
                        logger_1.logger.info("Running ".concat(pendingMigrations.length, " pending migrations"), {
                            service: "migrations",
                            pending: pendingMigrations.map(function (m) { return m.name; }),
                        });
                        _i = 0, pendingMigrations_1 = pendingMigrations;
                        _a.label = 4;
                    case 4:
                        if (!(_i < pendingMigrations_1.length)) return [3 /*break*/, 7];
                        migration = pendingMigrations_1[_i];
                        return [4 /*yield*/, this.executeMigration(migration)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 4];
                    case 7:
                        logger_1.logger.info("All migrations completed successfully", {
                            service: "migrations",
                            totalExecuted: pendingMigrations.length,
                        });
                        return [3 /*break*/, 9];
                    case 8:
                        error_4 = _a.sent();
                        logger_1.logger.error("Migration process failed:", error_4, {
                            service: "migrations",
                        });
                        throw error_4;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    MigrationRunner.prototype.rollbackMigration = function (migrationId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_1.database.query("DELETE FROM migrations WHERE id = $1", [
                                migrationId,
                            ])];
                    case 1:
                        _a.sent();
                        logger_1.logger.info("Migration rolled back: ".concat(migrationId), {
                            service: "migrations",
                            migrationId: migrationId,
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        logger_1.logger.error("Failed to rollback migration: ".concat(migrationId), error_5, {
                            service: "migrations",
                            migrationId: migrationId,
                        });
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MigrationRunner.prototype.getMigrationStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allMigrations, executedMigrations, lastExecutedResult, error_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.loadMigrationFiles()];
                    case 1:
                        allMigrations = _b.sent();
                        return [4 /*yield*/, this.getExecutedMigrations()];
                    case 2:
                        executedMigrations = _b.sent();
                        return [4 /*yield*/, database_1.database.query("SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1")];
                    case 3:
                        lastExecutedResult = _b.sent();
                        return [2 /*return*/, {
                                total: allMigrations.length,
                                executed: executedMigrations.length,
                                pending: allMigrations.length - executedMigrations.length,
                                lastExecuted: (_a = lastExecutedResult.rows[0]) === null || _a === void 0 ? void 0 : _a.name,
                            }];
                    case 4:
                        error_6 = _b.sent();
                        logger_1.logger.error("Failed to get migration status:", error_6, {
                            service: "migrations",
                        });
                        throw error_6;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return MigrationRunner;
}());
exports.MigrationRunner = MigrationRunner;
// Create and export singleton instance
exports.migrationRunner = new MigrationRunner();
exports.default = exports.migrationRunner;
