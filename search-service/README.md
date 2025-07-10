# Dzinza Search Service

A comprehensive search service for the Dzinza genealogy platform, built with FastAPI and Elasticsearch.

## Features

### Core Search APIs

- **POST /api/v1/search/** - General search across all document types
- **POST /api/v1/search/person** - Specialized genealogy search for people
- **GET /api/v1/search/suggest** - Type-ahead search suggestions

### Document Management APIs

- **POST /api/v1/search/index** - Index new documents
- **PUT /api/v1/search/index/{id}** - Update existing documents
- **DELETE /api/v1/search/index/{id}** - Remove documents from index

### System & Health APIs

- **GET /health** - Health check endpoint
- **GET /api-docs** - Swagger UI documentation
- **GET /metrics** - Prometheus metrics

## Architecture

### Technology Stack

- **Framework**: FastAPI with async/await support
- **Search Engine**: Elasticsearch for full-text search and indexing
- **Analytics Database**: MongoDB for search analytics and usage tracking
- **Authentication**: JWT Bearer token authentication
- **Logging**: Structured logging with structlog
- **Documentation**: OpenAPI/Swagger automatic documentation

### Service Architecture

```
search-service/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── api/
│   │   └── endpoints.py        # API endpoint definitions
│   ├── core/
│   │   └── config.py          # Configuration management
│   ├── schemas/
│   │   └── search.py          # Pydantic models for requests/responses
│   ├── services/
│   │   ├── elasticsearch_client.py  # Elasticsearch client singleton
│   │   ├── analytics.py            # MongoDB analytics service
│   │   └── search_service.py       # Main search business logic
│   ├── utils/
│   │   └── auth.py            # JWT authentication utilities
│   └── middleware/
│       └── logging.py         # Request logging middleware
├── requirements.txt           # Python dependencies
├── pyproject.toml            # Poetry configuration
├── Dockerfile               # Docker container configuration
└── .env.example             # Environment variables template
```

## Key Features

### Search Capabilities

- **Full-text search** with highlighting
- **Faceted search** and filtering
- **Fuzzy matching** for genealogy data
- **Privacy-aware** search results
- **Family tree scoping**
- **Pagination and sorting**

### Security & Privacy

- **JWT-based authentication**
- **Privacy level filtering** (public, family, private)
- **User-scoped search results**
- **Family tree access control**

### Monitoring & Observability

- **Structured logging** with request tracing
- **Health checks** for all dependencies
- **Prometheus metrics** support
- **OpenTelemetry instrumentation** ready

### Scalability Features

- **Async/await** for high concurrency
- **Connection pooling** for databases
- **Configurable CORS** origins
- **Environment-based configuration**

## Installation

### Prerequisites

- Python 3.11+
- Elasticsearch 8.x
- MongoDB 5.x+ (optional, for analytics)

### Setup

1. **Clone and navigate to the search service:**

   ```bash
   cd search-service
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the service:**
   ```bash
   python -m app.main
   ```

### Docker Deployment

```bash
docker build -t dzinza-search-service .
docker run -p 8000:8000 --env-file .env dzinza-search-service
```

## Configuration

### Environment Variables

See `.env.example` for all configuration options. Key settings include:

- **Elasticsearch**: URL, credentials, performance settings
- **MongoDB**: Analytics database configuration
- **JWT**: Authentication settings
- **CORS**: Allowed origins
- **Observability**: Metrics and tracing settings

### Elasticsearch Indices

The service automatically creates and manages these indices:

- `dzinza_persons` - People and genealogy data
- `dzinza_events` - Historical events and records
- `dzinza_comments` - User comments and annotations

## API Usage

### Authentication

All APIs except `/health` and `/metrics` require JWT Bearer token authentication:

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
     -X POST http://localhost:8000/api/v1/search/ \
     -H "Content-Type: application/json" \
     -d '{"query": "John Smith"}'
```

### Example Searches

#### General Search

```json
POST /api/v1/search/
{
  "query": "John Smith",
  "document_types": ["person", "event"],
  "privacy_levels": ["public", "family"],
  "family_tree_id": "family-123",
  "skip": 0,
  "limit": 10
}
```

#### Person Search (Genealogy-specific)

```json
POST /api/v1/search/person
{
  "first_name": "John",
  "last_name": "Smith",
  "birth_date_range": {
    "start_date": "1800-01-01T00:00:00Z",
    "end_date": "1900-12-31T23:59:59Z"
  },
  "place_of_birth": "London",
  "fuzzy_matching": true
}
```

#### Type-ahead Suggestions

```
GET /api/v1/search/suggest?query=joh&limit=5
```

### Document Indexing

```json
POST /api/v1/search/index
{
  "title": "John Smith Birth Record",
  "content": "Birth certificate for John Smith, born 1850...",
  "document_type": "person",
  "privacy_level": "family",
  "family_tree_id": "family-123",
  "metadata": {
    "birth_date": "1850-03-15",
    "location": "London, England"
  }
}
```

## Development

### Running in Development Mode

```bash
# Enable debug mode
export DEBUG=true

# Run with auto-reload
python -m app.main
```

### API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

### Health Monitoring

- **Health Check**: http://localhost:8000/health
- **Metrics**: http://localhost:8000/metrics

## Privacy & Security

The search service implements comprehensive privacy controls:

- **Public**: Accessible to all authenticated users
- **Family**: Restricted to family tree members
- **Private**: Only accessible to document creator
- **Admin**: Full access to all documents

Privacy filters are automatically applied based on JWT token claims including:

- User ID (`sub`)
- User role (`role`)
- Family tree access (`family_trees`)

## Performance & Scaling

### Elasticsearch Optimization

- Custom index mappings for genealogy data
- Optimized queries with proper field boosting
- Connection pooling and retry logic
- Configurable timeouts and limits

### Analytics & Monitoring

- Search query analytics stored in MongoDB
- Response time tracking
- Request logging with correlation IDs
- Prometheus metrics for monitoring

### High Availability

- Graceful startup/shutdown procedures
- Health checks for all dependencies
- Error handling with structured logging
- Connection resilience and retry logic

## Troubleshooting

### Common Issues

1. **Elasticsearch Connection Failed**

   - Check `ELASTICSEARCH_URL` in environment
   - Verify Elasticsearch is running and accessible
   - Check credentials and network connectivity

2. **Authentication Errors**

   - Verify JWT secret configuration
   - Check token format and expiration
   - Ensure audience claim matches configuration

3. **Search Returns No Results**
   - Check privacy level permissions
   - Verify family tree access
   - Review index mappings and data

### Logs

The service uses structured logging with JSON output for easy parsing:

```bash
# View logs with proper formatting
docker logs dzinza-search-service | jq .
```

## Contributing

1. Follow the established code architecture
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure proper error handling and logging
5. Test with different privacy scenarios

## License

This project is part of the Dzinza genealogy platform.
