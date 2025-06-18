import { Pool } from "pg";
import { logger } from "../shared/utils/logger"; // Import logger

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "dzinza",
  user: process.env.DB_USER || "dzinza_user",
  password: process.env.DB_PASSWORD || "password",
});

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string; // In DB: last_name
  preferredLanguage: string; // In DB: preferred_language
  emailVerified: boolean; // In DB: email_verified
  mfaEnabled?: boolean; // In DB: mfa_enabled
  createdAt: Date; // In DB: created_at
  updatedAt: Date; // In DB: updated_at

  // Fields for email verification and account status
  // These should map to DB columns like email_verification_token, email_verification_expires, etc.
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  emailVerifiedAt?: Date | null;
  lockedUntil?: Date | null;
  // Removed isEmailVerified as emailVerified should be the source of truth
}

// This interface is for data passed to User.create
// It uses camelCase corresponding to how JS objects are typically structured before DB interaction
export interface CreateUserData {
  id: string;
  email: string;
  password: string; // This will be hashed before saving
  firstName: string;
  lastName: string;
  preferredLanguage: string;
  emailVerified: boolean; // Default to false
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error }, "Error finding user by email:");
      throw error;
    }
  }

  static async findById(id: string): Promise<User | null> {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [
        id,
      ]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error }, "Error finding user by id:");
      throw error;
    }
  }

  static async create(userData: CreateUserData): Promise<User> {
    try {
      const result = await pool.query(
        `INSERT INTO users (id, email, password, first_name, last_name, preferred_language, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          userData.id,
          userData.email,
          userData.password,
          userData.firstName,
          userData.lastName,
          userData.preferredLanguage,
          userData.emailVerified,
          userData.createdAt,
          userData.updatedAt,
        ]
      );
      // Note: result.rows[0] will have snake_case keys from DB.
      // The User interface uses camelCase. A mapping function would be ideal here.
      // For now, assuming the caller handles this or the pg driver has a transform.
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error }, "Error creating user:");
      throw error;
    }
  }

  static async updateEmailVerified(
    id: string,
    verified: boolean
  ): Promise<void> {
    try {
      await pool.query(
        "UPDATE users SET email_verified = $1, updated_at = $2 WHERE id = $3",
        [verified, new Date(), id]
      );
    } catch (error) {
      logger.error({ err: error }, "Error updating email verification status:");
      throw error;
    }
  }

  static async updatePassword(id: string, newPassword: string): Promise<void> {
    try {
      await pool.query(
        "UPDATE users SET password = $1, updated_at = $2 WHERE id = $3",
        [newPassword, new Date(), id]
      );
    } catch (error) {
      logger.error({ err: error }, "Error updating password:");
      throw error;
    }
  }

  static async findByVerificationToken(token: string): Promise<User | null> {
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()",
        [token]
      );
      // Add mapping from snake_case to camelCase if interface requires it
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error }, "Error finding user by verification token:");
      throw error;
    }
  }

  static async verifyUserEmail(userId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE users
         SET email_verified = true,
             email_verification_token = NULL,
             email_verification_expires = NULL,
             email_verified_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );
    } catch (error) {
      logger.error({ err: error }, "Error verifying user email:");
      throw error;
    }
  }
}
