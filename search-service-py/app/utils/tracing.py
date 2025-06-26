from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as OTLPHttpSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME as RESOURCE_SERVICE_NAME

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.elasticsearch import ElasticsearchInstrumentor # For Elasticsearch client
from opentelemetry.instrumentation.motor import MotorInstrumentor # If using MongoDB
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

from app.core.config import settings
from app.utils.logger import logger

def init_tracer(service_name: str = settings.OTEL_SERVICE_NAME, jaeger_endpoint: str = settings.JAEGER_ENDPOINT):
    if not settings.ENABLE_TRACING:
        logger.info("OpenTelemetry tracing is disabled for search-service.")
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
            logger.debug("ConsoleSpanExporter enabled for OpenTelemetry tracing (search-service).")

        trace.set_tracer_provider(provider)
        logger.info(f"OpenTelemetry tracing initialized for service: {service_name}, exporting to {jaeger_endpoint}")

    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry tracer for search-service: {e}", exc_info=True)


def instrument_application_search(app): # Renamed
    """Instruments the FastAPI application and related libraries for OpenTelemetry."""
    if not settings.ENABLE_TRACING:
        return

    try:
        FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())

        # Elasticsearch instrumentation (typically global, call once)
        ElasticsearchInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())

        if settings.MONGODB_URI: # Only instrument Motor if MongoDB is configured and used
            MotorInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())

        HTTPXClientInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())

        logger.info("Search service application and libraries instrumented for OpenTelemetry.")
    except Exception as e:
        logger.error(f"Failed to instrument search service app for OpenTelemetry: {e}", exc_info=True)
