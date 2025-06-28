from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as OTLPHttpSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME as RESOURCE_SERVICE_NAME

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor # Crucial for gateway

from app.core.config import settings
from app.utils.logger import logger

def init_tracer(service_name: str = settings.OTEL_SERVICE_NAME, jaeger_endpoint: str = settings.JAEGER_ENDPOINT):
    if not settings.ENABLE_TRACING:
        logger.info("OpenTelemetry tracing is disabled for API Gateway.")
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
            logger.debug("ConsoleSpanExporter enabled for OpenTelemetry tracing (API Gateway).")

        trace.set_tracer_provider(provider)
        logger.info(f"OpenTelemetry tracing initialized for API Gateway: {service_name}, exporting to {jaeger_endpoint}")

    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry tracer for API Gateway: {e}", exc_info=True)


def instrument_application_gateway(app): # Renamed
    """Instruments the FastAPI application and HTTPX client for OpenTelemetry."""
    if not settings.ENABLE_TRACING:
        return

    try:
        FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())

        # HTTPXClientInstrumentor is critical for tracing requests made by the gateway
        # to downstream services. It should be called once.
        # The global http_client in proxy_service.py will be instrumented by this.
        HTTPXClientInstrumentor().instrument(tracer_provider=trace.get_tracer_provider())

        logger.info("API Gateway (FastAPI & HTTPX) instrumented for OpenTelemetry.")
    except Exception as e:
        logger.error(f"Failed to instrument API Gateway for OpenTelemetry: {e}", exc_info=True)
