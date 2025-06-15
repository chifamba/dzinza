"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerOptions = void 0;
var swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "Dzinza Backend API",
        version: "1.0.0",
        description: "Backend service for Dzinza genealogy platform",
    },
    servers: [
        {
            url: process.env.API_BASE_URL || "http://localhost:3001",
            description: "Development server",
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
};
exports.swaggerOptions = {
    definition: swaggerDefinition,
    apis: ["./src/routes/*.ts", "./src/shared/middleware/*.ts"], // paths to files containing OpenAPI definitions
};
