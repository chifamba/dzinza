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
var resources = require("@opentelemetry/resources");
var semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
var sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
var instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
var instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
var instrumentation_pg_1 = require("@opentelemetry/instrumentation-pg"); // For PostgreSQL
var instrumentation_mongodb_1 = require("@opentelemetry/instrumentation-mongodb"); // If using MongoDB
// Assuming logger is available, e.g., from shared utilities
// import { logger } from '../shared/utils/logger'; // Adjust path as needed
// Fallback logger if the main one isn't easily importable here
var consoleLogger = {
    info: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return console.log.apply(console, __spreadArray(["[Tracing INFO] ".concat(message)], args, false));
    },
    error: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return console.error.apply(console, __spreadArray(["[Tracing ERROR] ".concat(message)], args, false));
    },
};
var initTracer = function (serviceName, jaegerEndpoint, nodeEnv) {
    var _a;
    var traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: jaegerEndpoint,
    });
    var spanProcessor = nodeEnv === "production"
        ? new sdk_trace_node_1.BatchSpanProcessor(traceExporter)
        : new sdk_trace_node_1.SimpleSpanProcessor(new sdk_trace_node_1.ConsoleSpanExporter());
    var sdk = new sdk_node_1.NodeSDK({
        resource: resources.resourceFromAttributes((_a = {},
            _a[semantic_conventions_1.ATTR_SERVICE_NAME] = serviceName,
            _a[semantic_conventions_1.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] = nodeEnv,
            _a)),
        spanProcessor: spanProcessor,
        instrumentations: [
            new instrumentation_http_1.HttpInstrumentation(),
            new instrumentation_express_1.ExpressInstrumentation(),
            // new PinoInstrumentation({ // Uncomment and configure if Pino is used directly here
            //   logHook: (_span, record) => {
            //       record['resource.service.name'] = serviceName;
            //   },
            // }),
            new instrumentation_pg_1.PgInstrumentation(), // For PostgreSQL (if 'pg' library is used)
            new instrumentation_mongodb_1.MongoDBInstrumentation({
                // If backend-service also uses MongoDB directly
                enhancedDatabaseReporting: true,
            }),
            // Add other instrumentations as needed (e.g., generic-pool, redis)
        ],
    });
    try {
        sdk.start();
        // Use consoleLogger if main logger import is problematic
        consoleLogger.info("OpenTelemetry Tracing initialized for service: ".concat(serviceName, ", environment: ").concat(nodeEnv));
        consoleLogger.info("Jaeger exporter configured with endpoint: ".concat(jaegerEndpoint));
        if (nodeEnv !== "production") {
            consoleLogger.info("ConsoleSpanExporter is active for development/debugging.");
        }
    }
    catch (error) {
        consoleLogger.error("Error initializing OpenTelemetry Tracing:", error);
    }
    // Graceful shutdown
    var shutdown = function () {
        sdk
            .shutdown()
            .then(function () {
            return consoleLogger.info("OpenTelemetry Tracing terminated for ".concat(serviceName));
        })
            .catch(function (error) {
            return consoleLogger.error("Error terminating OpenTelemetry Tracing for ".concat(serviceName), error);
        })
            .finally(function () { return process.exit(0); });
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    return sdk;
};
exports.initTracer = initTracer;
