import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { logger } from "@shared/utils/logger.js"; // Import shared logger
// Pino for gateway logger seems to be from shared '../../../shared/utils/logger'
// If that shared logger is already instrumented or if gateway uses a different logger, adjust accordingly.

// Fallback logger if the main one isn't easily importable here or if it's not Pino
// const consoleLogger = { // Removed consoleLogger
//  info: (message: string, ...args: any[]) => console.log(`[Gateway Tracing INFO] ${message}`, ...args),
//  error: (message: string, ...args: any[]) => console.error(`[Gateway Tracing ERROR] ${message}`, ...args),
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

  // Simplified tracing configuration without Resource for now
  const sdk = new NodeSDK({
    spanProcessor: spanProcessor,
    instrumentations: [
      new HttpInstrumentation(), // General HTTP client/server instrumentation
      new ExpressInstrumentation(), // Express framework specific
      // Add other relevant instrumentations, e.g., for http-proxy-middleware if available
      // or ensure that HttpInstrumentation correctly covers client requests made by it.
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
      "Error initializing OpenTelemetry Tracing for Gateway:",
      error
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
          `Error terminating OpenTelemetry Tracing for ${serviceName}:`,
          error
        )
      )
      .finally(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return sdk;
};
