import { Options } from 'swagger-jsdoc';

export const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dzinza Genealogy Platform API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'RESTful API for the Dzinza Genealogy Platform',
      contact: {
        name: 'Dzinza Development Team',
        email: 'dev@dzinza.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.dzinza.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message'
            },
            details: {
              type: 'array',
              description: 'Detailed error information',
              items: {
                type: 'object'
              }
            }
          },
          required: ['error', 'message']
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            phone: {
              type: 'string',
              description: 'Phone number'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'prefer_not_to_say'],
              description: 'Gender'
            },
            profilePictureUrl: {
              type: 'string',
              format: 'uri',
              description: 'Profile picture URL'
            },
            bio: {
              type: 'string',
              description: 'User biography'
            },
            location: {
              type: 'object',
              description: 'User location information'
            },
            language: {
              type: 'string',
              enum: ['en', 'sn', 'nd'],
              description: 'Preferred language'
            },
            timezone: {
              type: 'string',
              description: 'User timezone'
            },
            emailVerified: {
              type: 'boolean',
              description: 'Whether email is verified'
            },
            twoFactorEnabled: {
              type: 'boolean',
              description: 'Whether 2FA is enabled'
            },
            subscriptionTier: {
              type: 'string',
              enum: ['free', 'basic', 'premium', 'enterprise'],
              description: 'Subscription tier'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          },
          required: ['id', 'email', 'username', 'firstName', 'lastName']
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token'
            }
          },
          required: ['accessToken']
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'warning'],
              description: 'Overall health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp'
            },
            service: {
              type: 'string',
              description: 'Service name'
            },
            version: {
              type: 'string',
              description: 'Service version'
            },
            dependencies: {
              type: 'object',
              description: 'Status of service dependencies'
            }
          },
          required: ['status', 'timestamp', 'service']
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Health',
        description: 'Service health and monitoring'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Genealogy',
        description: 'Family tree and genealogy data'
      },
      {
        name: 'Search',
        description: 'Search and discovery features'
      },
      {
        name: 'Storage',
        description: 'File and media storage'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './services/*/src/routes/*.ts',
    './services/*/src/routes/**/*.ts'
  ]
};

export default swaggerOptions;
