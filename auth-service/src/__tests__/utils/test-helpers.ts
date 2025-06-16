import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export interface TestUser {
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

export class TestHelper {
  static async createTestUser(
    userData: Partial<TestUser> = {}
  ): Promise<TestUser> {
    const hashedPassword = await bcrypt.hash(
      userData.password || "password123",
      10
    );

    const defaultUser: TestUser = {
      id: uuidv4(),
      email: userData.email || `test${Date.now()}@example.com`,
      password: hashedPassword,
      firstName: userData.firstName || "Test",
      lastName: userData.lastName || "User",
      preferredLanguage: userData.preferredLanguage || "en",
      emailVerified:
        userData.emailVerified !== undefined ? userData.emailVerified : true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...userData,
    };

    return defaultUser;
  }

  static generateAuthToken(userId: string): string {
    return jwt.sign(
      {
        userId,
        type: "access",
        sessionId: uuidv4(),
      },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      {
        userId,
        type: "refresh",
        tokenId: uuidv4(),
      },
      process.env.JWT_REFRESH_SECRET || "test-refresh-secret",
      { expiresIn: "7d" }
    );
  }

  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000
  ): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await this.delay(100);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async cleanDatabase(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  }

  static generateValidPassword(): string {
    return "TestPassword123!";
  }

  static generateValidEmail(): string {
    return `test${Date.now()}@example.com`;
  }
}
