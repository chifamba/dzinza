import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '@shared/utils/logger'; // Adjust path as needed

const router = express.Router();
const SERVICE_NAME = "genealogy-service";

router.get('/health', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  let dbStatus = "DOWN";
  let dbReason = "Database disconnected";

  try {
    if (mongoose.connection.readyState === 1) {
      dbStatus = "UP";
      dbReason = "";
    } else {
        dbReason = `Database in readyState: ${mongoose.connection.readyState}`;
    }
  } catch (error: any) {
    logger.error(`${SERVICE_NAME} /health - Database check failed:`, error);
    dbStatus = "DOWN";
    dbReason = error.message || "Database check failed";
  }

  const healthStatus = {
    status: dbStatus === "UP" ? "UP" : "DOWN",
    serviceName: SERVICE_NAME,
    timestamp,
    dependencies: {
      database: {
        status: dbStatus,
        reason: dbReason || undefined,
      }
    },
  };

  if (healthStatus.status === "DOWN") {
    return res.status(503).json(healthStatus);
  }
  return res.status(200).json(healthStatus);
});

export default router;
