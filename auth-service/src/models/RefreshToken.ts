import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "dzinza",
  user: process.env.DB_USER || "dzinza_user",
  password: process.env.DB_PASSWORD || "password",
});

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}

export interface CreateRefreshTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked?: boolean;
}

export class RefreshToken {
  static async create(
    tokenData: CreateRefreshTokenData
  ): Promise<RefreshToken> {
    try {
      const result = await pool.query(
        `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at, is_revoked)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          tokenData.id,
          tokenData.userId,
          tokenData.token,
          tokenData.expiresAt,
          tokenData.createdAt,
          tokenData.isRevoked || false,
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating refresh token:", error);
      throw error;
    }
  }

  static async findByToken(token: string): Promise<RefreshToken | null> {
    try {
      const result = await pool.query(
        "SELECT * FROM refresh_tokens WHERE token = $1 AND is_revoked = false AND expires_at > NOW()",
        [token]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding refresh token:", error);
      throw error;
    }
  }

  static async revokeToken(token: string): Promise<void> {
    try {
      await pool.query(
        "UPDATE refresh_tokens SET is_revoked = true WHERE token = $1",
        [token]
      );
    } catch (error) {
      console.error("Error revoking refresh token:", error);
      throw error;
    }
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await pool.query(
        "UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1",
        [userId]
      );
    } catch (error) {
      console.error("Error revoking user tokens:", error);
      throw error;
    }
  }

  static async cleanup(): Promise<void> {
    try {
      await pool.query(
        "DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true"
      );
    } catch (error) {
      console.error("Error cleaning up refresh tokens:", error);
      throw error;
    }
  }
}
