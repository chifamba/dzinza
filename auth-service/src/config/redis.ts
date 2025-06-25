import { createClient } from "redis";
import { logger } from "../utils/logger";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  password: process.env.REDIS_PASSWORD || "cmVkaXNfc2VjdXJlX3Bhc3N3b3JkXzc4OQo",
});

redisClient.on("error", (err) => {
  logger.error("Redis Client Error", err);
});

redisClient.on("connect", () => {
  logger.info("Redis connected");
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info("Redis connected successfully");
  } catch (error) {
    logger.error("Redis connection failed:", error);
    throw error;
  }
};

export default redisClient;
