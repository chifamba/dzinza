import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'; // Assuming Express
// If using AWS SDK, consider '@opentelemetry/instrumentation-aws-sdk'
// import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { logger } from '../shared/utils/logger'; // Import shared logger

// Fallback logger
// const consoleLogger = { // Removed consoleLogger
//   info: (message: string, ...args: any[]) => console.log(`[Storage Tracing INFO] ${message}`, ...args),
//   error: (message: string, ...args: any[]) => console.error(`[Storage Tracing ERROR] ${message}`, ...args),
// };

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
      // new AwsInstrumentation({ // Uncomment and configure if AWS SDK is used for S3
      //   suppressInternalInstrumentation: true, // Optional
      // }),
    ],
  });

  try {
    sdk.start();
    logger.info(`OpenTelemetry Tracing initialized for service: ${serviceName}, environment: ${nodeEnv}`);
    logger.info(`Jaeger exporter configured with endpoint: ${jaegerEndpoint}`);
    if (nodeEnv !== 'production') {
      logger.info('ConsoleSpanExporter is active for development/debugging.');
    }
  } catch (error) {
    logger.error({ err: error }, `Error initializing OpenTelemetry Tracing for ${serviceName}:`);
  }

  const shutdown = () => {
    sdk.shutdown()
      .then(() => logger.info(`OpenTelemetry Tracing terminated for ${serviceName}`))
      .catch((error) => logger.error({ err: error }, `Error terminating OpenTelemetry Tracing for ${serviceName}`))
      .finally(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return sdk;
};
