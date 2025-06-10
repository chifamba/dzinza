import express, { Request, Response } from 'express';
import { getElasticsearchClient } from '../config/elasticsearch'; // Adjust path as needed
import { logger } from '@shared/utils/logger'; // Adjust path as needed

const router = express.Router();
const SERVICE_NAME = "search-service";

router.get('/health', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  let esStatus = "DOWN";
  let esReason = "Elasticsearch client not initialized or ping failed.";
  let clientAvailable = true;

  try {
    const esClient = getElasticsearchClient(); // This might throw if client failed to initialize

    if (esClient) {
        const pingResponse = await esClient.ping();
        // According to @elastic/elasticsearch types, ping() returns a boolean in modern versions,
        // or throws an error. Older versions might have returned an object with a body.
        // Let's assume modern client where ping() returns true or throws.
        if (pingResponse === true || (typeof pingResponse === 'object' && (pingResponse as any).body === true)) { // Compatibility for older client versions
            esStatus = "UP";
            esReason = "";
        } else {
             // This case might not be reachable if ping throws on failure
            esReason = "Elasticsearch ping was unsuccessful.";
        }
    } else {
        clientAvailable = false; // Should have been caught by getElasticsearchClient() throwing
        esReason = "Elasticsearch client is not available (initialization may have failed).";
    }
  } catch (error: any) {
    logger.error(`${SERVICE_NAME} /health - Elasticsearch check failed:`, error);
    esStatus = "DOWN";
    if (!clientAvailable) {
        // If getElasticsearchClient() threw, error.message would be from there
        esReason = error.message || "Elasticsearch client initialization failed.";
    } else {
        esReason = error.message || "Elasticsearch ping failed or client unavailable.";
    }
  }

  const healthStatus = {
    status: esStatus === "UP" ? "UP" : "DOWN",
    serviceName: SERVICE_NAME,
    timestamp,
    dependencies: {
      elasticsearch: {
        status: esStatus,
        reason: esReason || undefined,
      }
    },
  };

  if (healthStatus.status === "DOWN") {
    return res.status(503).json(healthStatus);
  }
  return res.status(200).json(healthStatus);
});

export default router;
