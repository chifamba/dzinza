import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid"; // Import uuid v4

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "dzinza",
  user: process.env.DB_USER || "dzinza_user",
  password: process.env.DB_PASSWORD || "password",
});

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: any;
}

export interface CreateAuditLogData {
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: any;
}

export class AuditLog {
  static async create(logData: CreateAuditLogData): Promise<AuditLog> {
    try {
      const id = uuidv4(); // Use uuidv4
      const result = await pool.query(
        `INSERT INTO audit_logs (id, user_id, action, ip_address, user_agent, timestamp, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          id,
          logData.userId,
          logData.action,
          logData.ipAddress,
          logData.userAgent,
          logData.timestamp,
          logData.details ? JSON.stringify(logData.details) : null,
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw error;
    }
  }

  static async findByUserId(
    userId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const result = await pool.query(
        "SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2",
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error("Error finding audit logs by user ID:", error);
      throw error;
    }
  }

  static async findByAction(
    action: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const result = await pool.query(
        "SELECT * FROM audit_logs WHERE action = $1 ORDER BY timestamp DESC LIMIT $2",
        [action, limit]
      );
      return result.rows;
    } catch (error) {
      console.error("Error finding audit logs by action:", error);
      throw error;
    }
  }
}
