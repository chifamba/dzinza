import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'; // Using HTTP for wider compatibility, can be GRPC
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'; // If using Pino logger
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb'; // If using MongoDB
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4'; // For redis ioredis v4

import { logger } from './logger'; // Assuming your logger is here

export const initTracer = (serviceName: string, jaegerEndpoint: string, nodeEnv: string) => {
  const traceExporter = new OTLPTraceExporter({
    url: jaegerEndpoint, // e.g., http://localhost:4318/v1/traces for OTLP HTTP
  });

  const spanProcessor = nodeEnv === 'production'
    ? new BatchSpanProcessor(traceExporter)
    : new SimpleSpanProcessor(new ConsoleSpanExporter()); // Use ConsoleSpanExporter for dev/debug

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: nodeEnv,
    }),
    spanProcessor: spanProcessor,
    // traceExporter, // Not needed if using BatchSpanProcessor explicitly
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new PinoInstrumentation({ // Assuming Pino logger is used, configure as needed
        logHook: (_span, record) => {
            record['resource.service.name'] = serviceName;
        },
      }),
      new MongoDBInstrumentation({
        // Enable enhanced database reporting elsewhere in your application
        enhancedDatabaseReporting: true,
      }),
      new RedisInstrumentation(), // For ioredis v4+
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
    logger.error('Error initializing OpenTelemetry Tracing:', error);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => logger.info('OpenTelemetry Tracing terminated'))
      .catch((error) => logger.error('Error terminating OpenTelemetry Tracing', error))
      .finally(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    sdk.shutdown()
      .then(() => logger.info('OpenTelemetry Tracing terminated via SIGINT'))
      .catch((error) => logger.error('Error terminating OpenTelemetry Tracing via SIGINT', error))
      .finally(() => process.exit(0));
  });

  return sdk;
};
