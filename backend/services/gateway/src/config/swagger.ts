export const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dzinza Genealogy Platform API',
      version: '1.0.0',
      description: `
        # Dzinza Genealogy Platform API

        Welcome to the Dzinza API documentation. This platform provides comprehensive genealogy services
        including family tree management, DNA matching, historical records search, and media storage.

        ## Features
        
        - **Authentication & Authorization**: Secure user registration, login, and MFA
        - **Family Tree Management**: Create, update, and collaborate on family trees
        - **DNA Matching**: Advanced DNA analysis and relative matching
        - **Historical Records**: Search through extensive historical databases
        - **Media Storage**: Upload, enhance, and organize family photos and documents
        - **Search & Discovery**: Powerful search across all genealogy data

        ## Getting Started

        1. Register for an account at \`/api/auth/register\`
        2. Verify your email address
        3. Login at \`/api/auth/login\`
        4. Use the returned JWT token in the Authorization header for protected endpoints

        ## Rate Limits

        - General API calls: 1000 requests per 15 minutes
        - Authentication: 20 requests per 15 minutes
        - File uploads: 100 requests per hour
        - Search queries: 100 requests per minute

        ## Support

        For support and questions, contact us at support@dzinza.com
      `,
      contact: {
        name: 'Dzinza Support',
        email: 'support@dzinza.com',
        url: 'https://dzinza.com/support'
      },
      license: {
        name: 'Proprietary',
        url: 'https://dzinza.com/license'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
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
          description: 'JWT token obtained from the login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '64f123456789abcdef012345' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            preferredLanguage: { type: 'string', enum: ['en', 'sn', 'nd'], example: 'en' },
            isEmailVerified: { type: 'boolean', example: true },
            mfaEnabled: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        FamilyMember: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            birthDate: { type: 'string', format: 'date' },
            deathDate: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female', 'other', 'unknown'] },
            relationships: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  personId: { type: 'string' },
                  relationship: { type: 'string' }
                }
              }
            }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            originalName: { type: 'string' },
            filename: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'number' },
            url: { type: 'string', format: 'url' },
            category: { type: 'string', enum: ['document', 'image', 'video', 'audio', 'other'] },
            uploadedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Unauthorized', message: 'Authentication required' }
            }
          }
        },
        ForbiddenError: {
          description: 'Access forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Forbidden', message: 'Access denied' }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Not Found', message: 'Resource not found' }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { 
                error: 'Validation Error', 
                message: 'Invalid input data',
                details: { field: 'email', message: 'Invalid email format' }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Rate Limit Exceeded', message: 'Too many requests' }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Internal Server Error', message: 'Something went wrong' }
            }
          }
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
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'MFA',
        description: 'Multi-factor authentication management'
      },
      {
        name: 'Password Management',
        description: 'Password reset and change functionality'
      },
      {
        name: 'Family Tree',
        description: 'Family tree creation and management'
      },
      {
        name: 'DNA Matching',
        description: 'DNA analysis and matching services'
      },
      {
        name: 'Historical Records',
        description: 'Search and access historical records'
      },
      {
        name: 'Media',
        description: 'Photo and document upload and management'
      },
      {
        name: 'Search',
        description: 'Search across all genealogy data'
      },
      {
        name: 'Analytics',
        description: 'Usage analytics and insights'
      }
    ]
  },
  apis: [
    '../auth/src/routes/*.ts',
    '../genealogy/src/routes/*.ts',
    '../storage/src/routes/*.ts',
    '../search/src/routes/*.ts'
  ]
};
