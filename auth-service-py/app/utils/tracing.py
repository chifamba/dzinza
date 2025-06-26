from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter # For debugging
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as OTLPHttpSpanExporter
# from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter as OTLPGrpcSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME as RESOURCE_SERVICE_NAME

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor


from app.core.config import settings
from app.utils.logger import logger

def init_tracer(service_name: str = settings.OTEL_SERVICE_NAME, jaeger_endpoint: str = settings.JAEGER_ENDPOINT):
    """
    Initializes OpenTelemetry tracing.
    """
    if not settings.ENABLE_TRACING:
        logger.info("OpenTelemetry tracing is disabled.")
        return

    try:
        resource = Resource(attributes={
            RESOURCE_SERVICE_NAME: service_name,
            "environment": settings.ENVIRONMENT,
            # Add other common resource attributes here
        })

        provider = TracerProvider(resource=resource)

        # OTLP Exporter (HTTP by default, can switch to gRPC)
        otlp_exporter = OTLPHttpSpanExporter(endpoint=jaeger_endpoint)
        # otlp_exporter = OTLPGrpcSpanExporter(endpoint="localhost:4317") # Example for gRPC

        processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(processor)

        # Console exporter for debugging (optional)
        if settings.ENVIRONMENT == "development":
            console_exporter = ConsoleSpanExporter()
            console_processor = BatchSpanProcessor(console_exporter)
            provider.add_span_processor(console_processor)
            logger.debug("ConsoleSpanExporter enabled for OpenTelemetry tracing.")

        trace.set_tracer_provider(provider)
        logger.info(f"OpenTelemetry tracing initialized for service: {service_name}, exporting to {jaeger_endpoint}")

    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry tracer: {e}", exc_info=True)


def instrument_fastapi_app(app):
    """Instruments a FastAPI application and related libraries."""
    if not settings.ENABLE_TRACING:
        return

    try:
        FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())

        # Assuming 'engine' is your SQLAlchemy engine instance
        # from app.db.database import engine
        # SQLAlchemyInstrumentor().instrument(engine=engine) # Instrument after engine creation

        RedisInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())
        HTTPXClientInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())

        logger.info("FastAPI application and common libraries instrumented for OpenTelemetry.")
    except Exception as e:
        logger.error(f"Failed to instrument FastAPI app for OpenTelemetry: {e}", exc_info=True)

# Example of getting a tracer
# tracer = trace.get_tracer(__name__)
# with tracer.start_as_current_span("my-custom-span"):
#     # do some work
#     pass
