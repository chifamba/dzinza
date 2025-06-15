"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTracer = void 0;
var sdk_node_1 = require("@opentelemetry/sdk-node");
var exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
var semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
var sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
var instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
var instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
// Pino for gateway logger seems to be from shared '../../../shared/utils/logger'
// If that shared logger is already instrumented or if gateway uses a different logger, adjust accordingly.
// Fallback logger if the main one isn't easily importable here or if it's not Pino
var consoleLogger = {
    info: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return console.log.apply(console, __spreadArray(["[Gateway Tracing INFO] ".concat(message)], args, false));
    },
    error: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return console.error.apply(console, __spreadArray(["[Gateway Tracing ERROR] ".concat(message)], args, false));
    },
};
var initTracer = function (serviceName, jaegerEndpoint, nodeEnv) {
    var _a;
    var traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: jaegerEndpoint,
    });
    var spanProcessor = nodeEnv === 'production'
        ? new sdk_trace_node_1.BatchSpanProcessor(traceExporter)
        : new sdk_trace_node_1.SimpleSpanProcessor(new sdk_trace_node_1.ConsoleSpanExporter());
    var sdk = new sdk_node_1.NodeSDK({
        resource: new resources_1.Resource((_a = {},
            _a[semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME] = serviceName,
            _a[semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT] = nodeEnv,
            _a)),
        spanProcessor: spanProcessor,
        instrumentations: [
            new instrumentation_http_1.HttpInstrumentation(), // General HTTP client/server instrumentation
            new instrumentation_express_1.ExpressInstrumentation(), // Express framework specific
            // Add other relevant instrumentations, e.g., for http-proxy-middleware if available
            // or ensure that HttpInstrumentation correctly covers client requests made by it.
        ],
    });
    try {
        sdk.start();
        consoleLogger.info("OpenTelemetry Tracing initialized for service: ".concat(serviceName, ", environment: ").concat(nodeEnv));
        consoleLogger.info("Jaeger exporter configured with endpoint: ".concat(jaegerEndpoint));
        if (nodeEnv !== 'production') {
            consoleLogger.info('ConsoleSpanExporter is active for development/debugging.');
        }
    }
    catch (error) {
        consoleLogger.error('Error initializing OpenTelemetry Tracing for Gateway:', error);
    }
    var shutdown = function () {
        sdk.shutdown()
            .then(function () { return consoleLogger.info("OpenTelemetry Tracing terminated for ".concat(serviceName)); })
            .catch(function (error) { return consoleLogger.error("Error terminating OpenTelemetry Tracing for ".concat(serviceName), error); })
            .finally(function () { return process.exit(0); });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    return sdk;
};
exports.initTracer = initTracer;
