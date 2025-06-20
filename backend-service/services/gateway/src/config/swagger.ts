const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Dzinza Gateway API",
    version: "1.0.0",
    description: "API Gateway for Dzinza genealogy platform microservices",
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

export const swaggerConfig = {
  definition: swaggerDefinition,
  apis: ["./services/gateway/src/routes/*.ts"], // paths to files containing OpenAPI definitions
};

export default swaggerConfig;
