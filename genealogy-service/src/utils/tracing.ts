import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express"; // Assuming Express
// Add other relevant instrumentations e.g. MongoDB, Mongoose if used
import { logger } from "../utils/logger"; // Import shared logger

// Fallback logger
// const consoleLogger = { // Removed consoleLogger
//   info: (message: string, ...args: any[]) => console.log(`[Genealogy Tracing INFO] ${message}`, ...args),
//   error: (message: string, ...args: any[]) => console.error(`[Genealogy Tracing ERROR] ${message}`, ...args),
// };

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
    spanProcessor: spanProcessor,
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      // Add MongoDBInstrumentation if genealogy-service uses MongoDB directly
      // new MongoDBInstrumentation({ enhancedDatabaseReporting: true }),
    ],
  });

  try {
    sdk.start();
    logger.info(
      `OpenTelemetry Tracing initialized for service: ${serviceName}, environment: ${nodeEnv}`
    );
    logger.info(`Jaeger exporter configured with endpoint: ${jaegerEndpoint}`);
    if (nodeEnv !== "production") {
      logger.info("ConsoleSpanExporter is active for development/debugging.");
    }
  } catch (error) {
    logger.error(
      `Error initializing OpenTelemetry Tracing for ${serviceName}:`,
      { err: error }
    );
  }

  const shutdown = () => {
    sdk
      .shutdown()
      .then(() =>
        logger.info(`OpenTelemetry Tracing terminated for ${serviceName}`)
      )
      .catch((error) =>
        logger.error(
          `Error terminating OpenTelemetry Tracing for ${serviceName}`,
          { err: error }
        )
      )
      .finally(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return sdk;
};
