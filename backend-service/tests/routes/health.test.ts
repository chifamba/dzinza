import request from "supertest";
import express from "express";
import { healthRoutes } from "../../../src/routes/health";
import { database } from "../../../src/config/database";
import { migrationRunner } from "../../../src/config/migrations";
import { logger } from "../../../src/shared/utils/logger";

// Mock the dependencies
jest.mock("../../../src/config/database", () => ({
  database: {
    healthCheck: jest.fn(),
    query: jest.fn(),
    getPool: jest.fn(),
  },
}));

jest.mock("../../../src/config/migrations", () => ({
  migrationRunner: {
    getMigrationStatus: jest.fn(),
  },
}));

jest.mock("../../../src/shared/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Health Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a new Express app for each test
    app = express();
    app.use("/health", healthRoutes);
  });

  describe("GET /health", () => {
    it("should return 200 and healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("dzinza-api-gateway");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("version");
    });
  });

  describe("GET /health/detailed", () => {
    it("should return 200 and healthy status when all dependencies are healthy", async () => {
      // Mock database health check success
      (database.healthCheck as jest.Mock).mockResolvedValue({
        status: "connected",
        latency: 5,
        timestamp: new Date().toISOString(),
      });

      // Mock migration status
      (migrationRunner.getMigrationStatus as jest.Mock).mockResolvedValue({
        applied: 10,
        pending: 0,
        lastApplied: "20230101120000-create-users-table",
      });

      // Save original env vars
      const originalEnv = { ...process.env };

      // Set required env vars
      process.env.JWT_SECRET = "test-secret";
      process.env.DB_HOST = "localhost";
      process.env.DB_NAME = "dzinza_test";
      process.env.DB_USER = "test_user";

      const response = await request(app).get("/health/detailed");

      // Restore original env vars
      process.env = originalEnv;

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.dependencies.database.status).toBe("healthy");
      expect(response.body.dependencies.environment.status).toBe("healthy");
      expect(response.body.dependencies.migrations.status).toBe("healthy");

      // Verify logger was called
      expect(logger.info).toHaveBeenCalledWith(
        "Health check performed",
        expect.any(Object)
      );
    });

    it("should return 503 when database is unhealthy", async () => {
      // Mock database health check failure
      (database.healthCheck as jest.Mock).mockRejectedValue(
        new Error("Connection refused")
      );

      // Mock migration status
      (migrationRunner.getMigrationStatus as jest.Mock).mockResolvedValue({
        applied: 10,
        pending: 0,
        lastApplied: "20230101120000-create-users-table",
      });

      // Set required env vars
      const originalEnv = { ...process.env };
      process.env.JWT_SECRET = "test-secret";
      process.env.DB_HOST = "localhost";
      process.env.DB_NAME = "dzinza_test";
      process.env.DB_USER = "test_user";

      const response = await request(app).get("/health/detailed");

      // Restore original env vars
      process.env = originalEnv;

      expect(response.status).toBe(503);
      expect(response.body.status).toBe("unhealthy");
      expect(response.body.dependencies.database.status).toBe("unhealthy");
      expect(response.body.dependencies.database.error).toBe(
        "Connection refused"
      );

      // Verify logger was called
      expect(logger.info).toHaveBeenCalledWith(
        "Health check performed",
        expect.any(Object)
      );
    });

    it("should return 503 when environment variables are missing", async () => {
      // Mock database health check success
      (database.healthCheck as jest.Mock).mockResolvedValue({
        status: "connected",
        latency: 5,
        timestamp: new Date().toISOString(),
      });

      // Mock migration status
      (migrationRunner.getMigrationStatus as jest.Mock).mockResolvedValue({
        applied: 10,
        pending: 0,
        lastApplied: "20230101120000-create-users-table",
      });

      // Save original env vars and clear required ones
      const originalEnv = { ...process.env };
      delete process.env.JWT_SECRET;
      delete process.env.DB_HOST;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;

      const response = await request(app).get("/health/detailed");

      // Restore original env vars
      process.env = originalEnv;

      expect(response.status).toBe(503);
      expect(response.body.status).toBe("unhealthy");
      expect(response.body.dependencies.environment.status).toBe("unhealthy");
      expect(response.body.dependencies.environment.missingVariables).toContain(
        "JWT_SECRET"
      );
      expect(response.body.dependencies.environment.missingVariables).toContain(
        "DB_HOST"
      );
      expect(response.body.dependencies.environment.missingVariables).toContain(
        "DB_NAME"
      );
      expect(response.body.dependencies.environment.missingVariables).toContain(
        "DB_USER"
      );

      // Verify logger was called
      expect(logger.info).toHaveBeenCalledWith(
        "Health check performed",
        expect.any(Object)
      );
    });

    it("should return warning status when pending migrations exist", async () => {
      // Mock database health check success
      (database.healthCheck as jest.Mock).mockResolvedValue({
        status: "connected",
        latency: 5,
        timestamp: new Date().toISOString(),
      });

      // Mock migration status with pending migrations
      (migrationRunner.getMigrationStatus as jest.Mock).mockResolvedValue({
        applied: 10,
        pending: 2,
        lastApplied: "20230101120000-create-users-table",
        pendingMigrations: [
          "20230201120000-add-user-roles",
          "20230301120000-add-audit-logs",
        ],
      });

      // Set required env vars
      const originalEnv = { ...process.env };
      process.env.JWT_SECRET = "test-secret";
      process.env.DB_HOST = "localhost";
      process.env.DB_NAME = "dzinza_test";
      process.env.DB_USER = "test_user";

      const response = await request(app).get("/health/detailed");

      // Restore original env vars
      process.env = originalEnv;

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.dependencies.migrations.status).toBe("warning");
      expect(response.body.dependencies.migrations.pending).toBe(2);

      // Verify logger was called
      expect(logger.info).toHaveBeenCalledWith(
        "Health check performed",
        expect.any(Object)
      );
    });
  });

  describe("GET /health/database", () => {
    it("should return 200 and database details when database is healthy", async () => {
      // Mock database health check success
      (database.healthCheck as jest.Mock).mockResolvedValue({
        status: "connected",
        latency: 5,
        timestamp: new Date().toISOString(),
      });

      // Mock query result
      (database.query as jest.Mock).mockResolvedValue({
        rows: [{ table_name: "users" }, { table_name: "migrations" }],
      });

      // Mock pool stats
      (database.getPool as jest.Mock).mockReturnValue({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      });

      const response = await request(app).get("/health/database");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.database.status).toBe("connected");
      expect(response.body.database.requiredTables.users).toBe(true);
      expect(response.body.database.requiredTables.migrations).toBe(true);
      expect(response.body.database.connectionPool.totalCount).toBe(5);
      expect(response.body.database.connectionPool.idleCount).toBe(3);
      expect(response.body.database.connectionPool.waitingCount).toBe(0);
    });

    it("should return 503 when database is unhealthy", async () => {
      // Mock database health check failure
      (database.healthCheck as jest.Mock).mockRejectedValue(
        new Error("Connection refused")
      );

      const response = await request(app).get("/health/database");

      expect(response.status).toBe(503);
      expect(response.body.status).toBe("unhealthy");
      expect(response.body.database.error).toBe("Connection refused");

      // Verify logger was called
      expect(logger.error).toHaveBeenCalledWith(
        "Database health check failed:",
        expect.any(Error),
        { service: "health" }
      );
    });
  });

  describe("GET /health/migrations", () => {
    it("should return 200 and migration status", async () => {
      // Mock migration status
      (migrationRunner.getMigrationStatus as jest.Mock).mockResolvedValue({
        applied: 10,
        pending: 0,
        lastApplied: "20230101120000-create-users-table",
      });

      const response = await request(app).get("/health/migrations");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.migrations.applied).toBe(10);
      expect(response.body.migrations.pending).toBe(0);
    });

    it("should return pending status when migrations are pending", async () => {
      // Mock migration status with pending migrations
      (migrationRunner.getMigrationStatus as jest.Mock).mockResolvedValue({
        applied: 10,
        pending: 2,
        lastApplied: "20230101120000-create-users-table",
      });

      const response = await request(app).get("/health/migrations");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("pending");
      expect(response.body.migrations.pending).toBe(2);
    });

    it("should return 503 when migration check fails", async () => {
      // Mock migration check failure
      (migrationRunner.getMigrationStatus as jest.Mock).mockRejectedValue(
        new Error("Failed to access migrations table")
      );

      const response = await request(app).get("/health/migrations");

      expect(response.status).toBe(503);
      expect(response.body.status).toBe("unhealthy");
      expect(response.body.error).toBe("Failed to access migrations table");

      // Verify logger was called
      expect(logger.error).toHaveBeenCalledWith(
        "Migration status check failed:",
        expect.any(Error),
        { service: "health" }
      );
    });
  });
});
