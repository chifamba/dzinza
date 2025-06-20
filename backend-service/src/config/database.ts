import { Pool, PoolClient, QueryResult } from "pg"; // Added QueryResult
import mongoose from "mongoose";
import { logger } from "../shared/utils/logger";

interface DatabaseConfig {
  postgres: Pool;
  mongodb: typeof mongoose;
}

interface HealthCheckResult {
  status: "connected" | "disconnected" | "error";
  latency?: number;
  timestamp?: string;
  error?: string;
}

// Create PostgreSQL pool lazily to ensure environment variables are loaded
let pgPool: Pool | null = null;

const createPgPool = () => {
  if (!pgPool) {
    const pgConfig = {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "dzinza",
      user: process.env.DB_USER || "dzinza_user",
      password: process.env.DB_PASSWORD || "password",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    // Log the database configuration (without password)
    logger.info("PostgreSQL configuration:", {
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
      passwordSet: !!pgConfig.password,
    });

    pgPool = new Pool(pgConfig);
  }
  return pgPool;
};

// MongoDB configuration
const initMongoDB = async (): Promise<typeof mongoose> => {
  try {
    const mongoUrl =
      process.env.MONGO_URL || "mongodb://localhost:27017/dzinza";

    await mongoose.connect(mongoUrl);
    logger.info("Connected to MongoDB");

    return mongoose;
  } catch (error) {
    logger.error("Failed to connect to MongoDB:", error);
    throw error;
  }
};

// Database connection manager
const connectToDatabase = async (): Promise<DatabaseConfig> => {
  try {
    // Create PostgreSQL pool (this ensures env vars are loaded)
    const pool = createPgPool();

    // Test PostgreSQL connection
    const pgClient = await pool.connect();
    logger.info("Connected to PostgreSQL");
    pgClient.release();

    // Initialize MongoDB
    const mongodb = await initMongoDB();

    return {
      postgres: pool,
      mongodb,
    };
  } catch (error) {
    logger.error("Database initialization failed:", error);
    throw error;
  }
};

const disconnectFromDatabase = async (): Promise<void> => {
  try {
    if (pgPool) {
      await pgPool.end();
    }
    await mongoose.disconnect();
    logger.info("Disconnected from all databases");
  } catch (error) {
    logger.error("Error during database disconnection:", error);
    throw error;
  }
};

// Database query method
const query = async (
  text: string,
  params?: unknown[]
): Promise<QueryResult> => {
  // Changed types
  try {
    const pool = createPgPool();
    const result: QueryResult = await pool.query(text, params);
    return result;
  } catch (error) {
    logger.error("Database query error:", error);
    throw error;
  }
};

// Database transaction method
const transaction = async (
  callback: (client: PoolClient) => Promise<void>
): Promise<void> => {
  const pool = createPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await callback(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Health check method
const healthCheck = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  try {
    const pool = createPgPool();
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    const latency = Date.now() - startTime;
    return {
      status: "connected",
      latency,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: "error",
      latency,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Get pool information
const getPool = () => ({
  totalCount: pgPool?.totalCount || 0,
  idleCount: pgPool?.idleCount || 0,
  waitingCount: pgPool?.waitingCount || 0,
});

export const database = {
  get postgres() {
    return createPgPool();
  },
  mongodb: mongoose,
  initialize: connectToDatabase,
  connect: connectToDatabase,
  disconnect: disconnectFromDatabase,
  query,
  transaction,
  healthCheck,
  getPool,
};
