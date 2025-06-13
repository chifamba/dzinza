import { Client } from "@elastic/elasticsearch";
import { logger } from "../utils/logger";

const ELASTICSEARCH_NODE =
  process.env.ELASTICSEARCH_NODE || "http://localhost:9200";
const ELASTICSEARCH_USERNAME = process.env.ELASTICSEARCH_USERNAME; // Optional
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD; // Optional

let client: Client;

try {
  const clientOptions: any = {
    node: ELASTICSEARCH_NODE,
  };

  if (ELASTICSEARCH_USERNAME && ELASTICSEARCH_PASSWORD) {
    clientOptions.auth = {
      username: ELASTICSEARCH_USERNAME,
      password: ELASTICSEARCH_PASSWORD,
    };
  }
  // Add other options like TLS/SSL configuration if needed for cloud deployments
  // clientOptions.tls = {
  //   ca: fs.readFileSync('./http_ca.crt'), // Path to your CA certificate
  //   rejectUnauthorized: true // Usually true in production
  // };

  client = new Client(clientOptions);

  // Optional: Test connection on startup (can be done in server.ts or a dedicated health check)
  client
    .ping()
    .then(() => logger.info("Elasticsearch client connected successfully."))
    .catch((error) =>
      logger.error("Elasticsearch client connection error:", error)
    );
} catch (error) {
  logger.error("Failed to initialize Elasticsearch client:", error);
  // Depending on your application's needs, you might want to exit if ES is critical
  // process.exit(1);
  // For now, we'll allow the app to start and log the error.
  // The client variable might be undefined, so services using it must handle this.
}

// Export a function to get the client, allowing for lazy initialization or handling of undefined client
export const getElasticsearchClient = (): Client => {
  if (!client) {
    // This might happen if the initial connection failed and the app continued.
    // You could attempt to re-initialize or throw a more specific error.
    logger.error(
      "Elasticsearch client is not initialized. Attempting to re-initialize (not recommended for production)."
    );
    // Re-attempting initialization here is generally not a good pattern for production.
    // Better to ensure it's configured correctly and handle critical startup failures.
    // For this context, we'll just log and it will likely fail downstream.
    throw new Error(
      "Elasticsearch client is not available. Check logs for initialization errors."
    );
  }
  return client;
};

// For direct export if you are sure about its initialization or handle errors at usage points
export { client as esClient };
