import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { database } from "./database.js";
import { logger } from "../shared/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Migration {
  id: string;
  name: string;
  sql: string;
  timestamp: Date;
}

export class MigrationRunner {
  private migrationsPath: string;

  constructor(
    migrationsPath: string = join(__dirname, "../../../../database/init")
  ) {
    this.migrationsPath = migrationsPath;
  }

  async ensureMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await database.query(createTableQuery);
      logger.info("Migrations table ready", { service: "migrations" });
    } catch (error) {
      logger.error("Failed to create migrations table:", error, {
        service: "migrations",
      });
      throw error;
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await database.query(
        "SELECT id FROM migrations ORDER BY executed_at ASC"
      );
      return result.rows.map((row: { id: string }) => row.id); // Typed row
    } catch (error) {
      logger.error("Failed to get executed migrations:", error, {
        service: "migrations",
      });
      throw error;
    }
  }

  async loadMigrationFiles(): Promise<Migration[]> {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter((file) => file.endsWith(".sql"))
        .sort();

      const migrations: Migration[] = [];

      for (const file of files) {
        const filePath = join(this.migrationsPath, file);
        const sql = readFileSync(filePath, "utf8");
        const id = file.replace(".sql", "");

        migrations.push({
          id,
          name: file,
          sql,
          timestamp: new Date(),
        });
      }

      logger.info(`Loaded ${migrations.length} migration files`, {
        service: "migrations",
        files: migrations.map((m) => m.name),
      });

      return migrations;
    } catch (error) {
      logger.error("Failed to load migration files:", error, {
        service: "migrations",
      });
      throw error;
    }
  }

  async executeMigration(migration: Migration): Promise<void> {
    try {
      await database.transaction(async (client) => {
        // Execute the migration SQL
        await client.query(migration.sql);

        // Record the migration as executed
        await client.query(
          "INSERT INTO migrations (id, name) VALUES ($1, $2)",
          [migration.id, migration.name]
        );
      });

      logger.info(`Migration executed successfully: ${migration.name}`, {
        service: "migrations",
        migrationId: migration.id,
      });
    } catch (error) {
      logger.error(`Failed to execute migration: ${migration.name}`, error, {
        service: "migrations",
        migrationId: migration.id,
      });
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    try {
      logger.info("Starting database migrations", { service: "migrations" });

      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      logger.info(`Found ${executedMigrations.length} executed migrations`, {
        service: "migrations",
        executed: executedMigrations,
      });

      // Load all migration files
      const allMigrations = await this.loadMigrationFiles();

      // Find pending migrations
      const pendingMigrations = allMigrations.filter(
        (migration) => !executedMigrations.includes(migration.id)
      );

      if (pendingMigrations.length === 0) {
        logger.info("No pending migrations", { service: "migrations" });
        return;
      }

      logger.info(`Running ${pendingMigrations.length} pending migrations`, {
        service: "migrations",
        pending: pendingMigrations.map((m) => m.name),
      });

      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      logger.info("All migrations completed successfully", {
        service: "migrations",
        totalExecuted: pendingMigrations.length,
      });
    } catch (error) {
      logger.error("Migration process failed:", error, {
        service: "migrations",
      });
      throw error;
    }
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    try {
      await database.query("DELETE FROM migrations WHERE id = $1", [
        migrationId,
      ]);

      logger.info(`Migration rolled back: ${migrationId}`, {
        service: "migrations",
        migrationId,
      });
    } catch (error) {
      logger.error(`Failed to rollback migration: ${migrationId}`, error, {
        service: "migrations",
        migrationId,
      });
      throw error;
    }
  }

  async getMigrationStatus(): Promise<{
    total: number;
    executed: number;
    pending: number;
    lastExecuted?: string;
  }> {
    try {
      const allMigrations = await this.loadMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      const lastExecutedResult = await database.query(
        "SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1"
      );

      return {
        total: allMigrations.length,
        executed: executedMigrations.length,
        pending: allMigrations.length - executedMigrations.length,
        lastExecuted: lastExecutedResult.rows[0]?.name,
      };
    } catch (error) {
      logger.error("Failed to get migration status:", error, {
        service: "migrations",
      });
      throw error;
    }
  }
}

// Create and export singleton instance
export const migrationRunner = new MigrationRunner();
export default migrationRunner;
