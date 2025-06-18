import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import * as resources from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg"; // For PostgreSQL
import { MongoDBInstrumentation } from "@opentelemetry/instrumentation-mongodb"; // If using MongoDB

// Assuming logger is available, e.g., from shared utilities
// import { logger } from '../shared/utils/logger'; // Adjust path as needed

// Fallback logger if the main one isn't easily importable here
const consoleLogger = {
  info: (message: string, ...args: any[]) =>
    console.log(`[Tracing INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) =>
    console.error(`[Tracing ERROR] ${message}`, ...args),
};

export const initTracer = (
  serviceName: string,
  jaegerEndpoint: string,
  nodeEnv: string
) => {
  const traceExporter = new OTLPTraceExporter({
    url: jaegerEndpoint,
  });

  const spanProcessor =
    nodeEnv === "production"
      ? new BatchSpanProcessor(traceExporter)
      : new SimpleSpanProcessor(new ConsoleSpanExporter());

  const sdk = new NodeSDK({
    resource: resources.resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: nodeEnv,
    }),
    spanProcessor: spanProcessor,
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new PgInstrumentation(), // For PostgreSQL (if 'pg' library is used)
      new MongoDBInstrumentation({
        // If backend-service also uses MongoDB directly
        enhancedDatabaseReporting: true,
      }),
      // Add other instrumentations as needed (e.g., generic-pool, redis)
    ],
  });

  try {
    sdk.start();
    // Use consoleLogger if main logger import is problematic
    consoleLogger.info(
      `OpenTelemetry Tracing initialized for service: ${serviceName}, environment: ${nodeEnv}`
    );
    consoleLogger.info(
      `Jaeger exporter configured with endpoint: ${jaegerEndpoint}`
    );
    if (nodeEnv !== "production") {
      consoleLogger.info(
        "ConsoleSpanExporter is active for development/debugging."
      );
    }
  } catch (error) {
    consoleLogger.error("Error initializing OpenTelemetry Tracing:", error);
  }

  // Graceful shutdown
  const shutdown = () => {
    sdk
      .shutdown()
      .then(() =>
        consoleLogger.info(
          `OpenTelemetry Tracing terminated for ${serviceName}`
        )
      )
      .catch((error) =>
        consoleLogger.error(
          `Error terminating OpenTelemetry Tracing for ${serviceName}`,
          error
        )
      )
      .finally(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return sdk;
};
