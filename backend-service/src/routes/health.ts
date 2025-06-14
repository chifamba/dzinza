import { Router } from "express";
import { database } from "../config/database";
import { migrationRunner } from "../config/migrations";
import { logger } from "../shared/utils/logger";

const router = Router();

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
router.get("/", (req, res) => {
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
router.get("/detailed", async (req, res) => {
  const healthStatus: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "dzinza-api-gateway",
    version: process.env.npm_package_version || "1.0.0",
    dependencies: {},
  };

  let overallHealthy = true;

  // Check database connectivity
  try {
    const dbHealth = await database.healthCheck();
    healthStatus.dependencies.database = {
      status: "healthy",
      latency: dbHealth.latency,
      timestamp: dbHealth.timestamp,
    };
  } catch (error) {
    overallHealthy = false;
    healthStatus.dependencies.database = {
      status: "unhealthy",
      error:
        error instanceof Error ? error.message : "Database connection failed",
    };
  }

  // Check environment variables
  const requiredEnvVars = ["JWT_SECRET", "DB_HOST", "DB_NAME", "DB_USER"];
  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  healthStatus.dependencies.environment = {
    status: missingEnvVars.length === 0 ? "healthy" : "unhealthy",
    missingVariables: missingEnvVars,
  };

  if (missingEnvVars.length > 0) {
    overallHealthy = false;
  }

  // Check migrations status
  try {
    const migrationStatus = await migrationRunner.getMigrationStatus();
    healthStatus.dependencies.migrations = {
      status: migrationStatus.pending === 0 ? "healthy" : "warning",
      ...migrationStatus,
    };
  } catch (error) {
    healthStatus.dependencies.migrations = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Migration check failed",
    };
  }

  // Set overall status
  healthStatus.status = overallHealthy ? "healthy" : "unhealthy";

  // Log health check
  logger.info("Health check performed", {
    service: "health",
    status: healthStatus.status,
    dependencies: Object.keys(healthStatus.dependencies).map((dep) => ({
      name: dep,
      status: healthStatus.dependencies[dep].status,
    })),
  });

  const statusCode = overallHealthy ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

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
router.get("/database", async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();

    // Additional database checks
    const tableCheckResult = await database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'migrations')
    `);

    const tablesExist = tableCheckResult.rows.map((row: any) => row.table_name);

    res.json({
      status: "healthy",
      database: {
        ...dbHealth,
        requiredTables: {
          users: tablesExist.includes("users"),
          migrations: tablesExist.includes("migrations"),
        },
        connectionPool: {
          totalCount: database.getPool().totalCount,
          idleCount: database.getPool().idleCount,
          waitingCount: database.getPool().waitingCount,
        },
      },
    });
  } catch (error) {
    logger.error("Database health check failed:", error, { service: "health" });

    res.status(503).json({
      status: "unhealthy",
      database: {
        error:
          error instanceof Error
            ? error.message
            : "Database health check failed",
      },
    });
  }
});

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
router.get("/migrations", async (req, res) => {
  try {
    const migrationStatus = await migrationRunner.getMigrationStatus();

    res.json({
      status: migrationStatus.pending === 0 ? "healthy" : "pending",
      migrations: migrationStatus,
    });
  } catch (error) {
    logger.error("Migration status check failed:", error, {
      service: "health",
    });

    res.status(503).json({
      status: "unhealthy",
      error:
        error instanceof Error
          ? error.message
          : "Migration status check failed",
    });
  }
});

export { router as healthRoutes };
