import { Queue } from "bullmq";
import { config } from "dotenv";
config();

export const duplicateDetectionQueue = new Queue("duplicate-detection", {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});
