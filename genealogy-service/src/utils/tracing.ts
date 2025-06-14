import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'; // Assuming Express
// Add other relevant instrumentations e.g. MongoDB, Mongoose if used

// Fallback logger
const consoleLogger = {
  info: (message: string, ...args: any[]) => console.log(`[Genealogy Tracing INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[Genealogy Tracing ERROR] ${message}`, ...args),
};

export const initTracer = (serviceName: string, jaegerEndpoint: string, nodeEnv: string) => {
  const traceExporter = new OTLPTraceExporter({
    url: jaegerEndpoint,
  });

  const spanProcessor = nodeEnv === 'production'
    ? new BatchSpanProcessor(traceExporter)
    : new SimpleSpanProcessor(new ConsoleSpanExporter());

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: nodeEnv,
    }),
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
    consoleLogger.info(`OpenTelemetry Tracing initialized for service: ${serviceName}, environment: ${nodeEnv}`);
    consoleLogger.info(`Jaeger exporter configured with endpoint: ${jaegerEndpoint}`);
    if (nodeEnv !== 'production') {
      consoleLogger.info('ConsoleSpanExporter is active for development/debugging.');
    }
  } catch (error) {
    consoleLogger.error(`Error initializing OpenTelemetry Tracing for ${serviceName}:`, error);
  }

  const shutdown = () => {
    sdk.shutdown()
      .then(() => consoleLogger.info(`OpenTelemetry Tracing terminated for ${serviceName}`))
      .catch((error) => consoleLogger.error(`Error terminating OpenTelemetry Tracing for ${serviceName}`, error))
      .finally(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return sdk;
};
