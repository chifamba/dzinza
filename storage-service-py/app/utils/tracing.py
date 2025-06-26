from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as OTLPHttpSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME as RESOURCE_SERVICE_NAME

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.motor import MotorInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
# For Boto3, the instrumentation is typically for botocore
from opentelemetry.instrumentation.botocore import BotocoreInstrumentor

from app.core.config import settings
from app.utils.logger import logger

def init_tracer(service_name: str = settings.OTEL_SERVICE_NAME, jaeger_endpoint: str = settings.JAEGER_ENDPOINT):
    if not settings.ENABLE_TRACING:
        logger.info("OpenTelemetry tracing is disabled for storage-service.")
        return

    try:
        resource = Resource(attributes={
            RESOURCE_SERVICE_NAME: service_name,
            "environment": settings.ENVIRONMENT,
        })

        provider = TracerProvider(resource=resource)
        otlp_exporter = OTLPHttpSpanExporter(endpoint=jaeger_endpoint)
        processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(processor)

        if settings.ENVIRONMENT == "development":
            console_exporter = ConsoleSpanExporter()
            console_processor = BatchSpanProcessor(console_exporter)
            provider.add_span_processor(console_processor)
            logger.debug("ConsoleSpanExporter enabled for OpenTelemetry tracing (storage-service).")

        trace.set_tracer_provider(provider)
        logger.info(f"OpenTelemetry tracing initialized for service: {service_name}, exporting to {jaeger_endpoint}")

    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry tracer for storage-service: {e}", exc_info=True)


def instrument_application_storage(app): # Renamed to avoid conflict
    """Instruments the FastAPI application and related libraries for OpenTelemetry."""
    if not settings.ENABLE_TRACING:
        return

    try:
        FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())
        MotorInstrumentor().instrument() # Global instrumentation for Motor
        HTTPXClientInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())

        # Instrument Botocore for Boto3 S3 client
        # This should be called once, typically at application startup.
        BotocoreInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())

        logger.info("Storage service application and libraries instrumented for OpenTelemetry.")
    except Exception as e:
        logger.error(f"Failed to instrument storage service app for OpenTelemetry: {e}", exc_info=True)
