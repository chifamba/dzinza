from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as OTLPHttpSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME as RESOURCE_SERVICE_NAME

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.motor import MotorInstrumentor # For MongoDB with Motor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.celery import CeleryInstrumentor # For Celery tasks

from app.core.config import settings
from app.utils.logger import logger

def init_tracer(service_name: str = settings.OTEL_SERVICE_NAME, jaeger_endpoint: str = settings.JAEGER_ENDPOINT):
    if not settings.ENABLE_TRACING:
        logger.info("OpenTelemetry tracing is disabled for genealogy-service.")
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
            logger.debug("ConsoleSpanExporter enabled for OpenTelemetry tracing (genealogy-service).")

        trace.set_tracer_provider(provider)
        logger.info(f"OpenTelemetry tracing initialized for service: {service_name}, exporting to {jaeger_endpoint}")

    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry tracer for genealogy-service: {e}", exc_info=True)


def instrument_application(app): # Renamed from instrument_fastapi_app for clarity
    """Instruments the FastAPI application and related libraries for OpenTelemetry."""
    if not settings.ENABLE_TRACING:
        return

    try:
        FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())

        # Motor instrumentation should be done once the client is available,
        # or it can be done globally if client is global.
        # For now, assume it can be called here.
        # MotorInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())
        # This is usually done by instrumenting the client instance if possible, or globally.
        # The MotorInstrumentor docs say: "MotorInstrumentor().instrument()" is enough if Motor is imported.
        # Let's try the global instrumentation approach.
        MotorInstrumentor().instrument()

        HTTPXClientInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())

        # Celery instrumentation (if Celery app is accessible here or instrumented at worker startup)
        # from app.tasks.celery_app import celery_app # Avoid circular import if not careful
        # CeleryInstrumentor().instrument(celery_app=celery_app, tracer_provider=trace.get_tracer_provider())
        # More commonly, Celery is instrumented when the worker starts.
        # For producers (FastAPI app sending tasks), ensure context propagation.
        CeleryInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())


        logger.info("Genealogy service application and libraries instrumented for OpenTelemetry.")
    except Exception as e:
        logger.error(f"Failed to instrument genealogy service app for OpenTelemetry: {e}", exc_info=True)
