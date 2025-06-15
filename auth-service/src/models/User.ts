import { Pool } from "pg";

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
  lastName: string;
  preferredLanguage: string;
  emailVerified: boolean;
  mfaEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  preferredLanguage: string;
  emailVerified: boolean;
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
      console.error("Error finding user by email:", error);
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
      console.error("Error finding user by id:", error);
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
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user:", error);
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
      console.error("Error updating email verification status:", error);
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
      console.error("Error updating password:", error);
      throw error;
    }
  }
}
