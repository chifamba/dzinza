import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'; // Assuming Express
// Import Elasticsearch instrumentation if direct ES client is used
// import { ElasticsearchInstrumentation } from '@opentelemetry/instrumentation-elasticsearch';


// Fallback logger
const consoleLogger = {
  info: (message: string, ...args: any[]) => console.log(`[Search Tracing INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[Search Tracing ERROR] ${message}`, ...args),
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
      // new ElasticsearchInstrumentation(), // Add if using Elasticsearch client directly
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
