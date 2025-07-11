# MongoDB Connection Pooling Implementation

## Overview

The genealogy service now implements comprehensive MongoDB connection pooling to improve performance, concurrency, and resource efficiency. This document outlines the implementation details and monitoring capabilities.

## Connection Pool Configuration

### Settings (in `app/core/config.py`)

```python
# MongoDB Connection Pool settings
MONGODB_MIN_POOL_SIZE: int = 10              # Minimum connections in the pool
MONGODB_MAX_POOL_SIZE: int = 100             # Maximum connections in the pool
MONGODB_MAX_IDLE_TIME_MS: int = 30000        # Max idle time for connections (30s)
MONGODB_CONNECT_TIMEOUT_MS: int = 10000      # Connection timeout (10s)
MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = 30000  # Server selection timeout (30s)
MONGODB_SOCKET_TIMEOUT_MS: int = 20000       # Socket timeout (20s)
MONGODB_WAIT_QUEUE_TIMEOUT_MS: int = 10000   # Wait queue timeout (10s)
MONGODB_HEARTBEAT_FREQUENCY_MS: int = 10000  # Heartbeat frequency (10s)
```

### Pool Implementation (in `app/db/base.py`)

The `connect_to_mongo()` function configures the AsyncIOMotorClient with:

- **Connection Pool Management**: Min/max pool sizes, idle timeout
- **Timeout Configuration**: Connection, server selection, socket, and wait queue timeouts
- **Performance Optimizations**:
  - Retry writes and reads enabled
  - Compression (zstd, zlib, snappy)
  - Secondary preferred read preference for load distribution
- **Health Monitoring**: Heartbeat frequency for connection health

## Key Features

### 1. Connection Pool Stats

Real-time monitoring of connection pool metrics:

- Current active connections
- Available connections
- Total connections created
- Pool configuration details

### 2. Database Health Checks

Comprehensive health monitoring:

- Database connectivity status
- Collection count
- Object count
- Data and storage size

### 3. Performance Optimizations

- **Async Index Creation**: All major collections have optimized indexes
- **Binary UUID Handling**: Proper UUID conversion for MongoDB storage
- **Connection Reuse**: Efficient connection pooling reduces overhead
- **Compression**: Network traffic reduction with multiple compression algorithms

## Monitoring Endpoints

### `/health`

Main health check with full database and connection pool stats:

```json
{
  "status": "healthy",
  "service": "Genealogy Service",
  "version": "0.1.0",
  "mongodb": "connected",
  "database_health": {
    "status": "healthy",
    "database": "dzinza_genealogy",
    "collections": 8,
    "objects": 35,
    "data_size": 22276.0,
    "storage_size": 249856.0
  },
  "connection_pool": {
    "connections": {
      "current": 17,
      "available": 838843,
      "total_created": 2955
    },
    "pool_config": {
      "min_pool_size": 10,
      "max_pool_size": 100,
      "max_idle_time_ms": 30000
    },
    "database": "dzinza_genealogy"
  }
}
```

### `/health/pool`

Dedicated connection pool statistics endpoint

### `/health/database`

Detailed database health with timestamp

## Connection Pool Benefits

### 1. Performance Improvements

- **Reduced Latency**: Reuse existing connections instead of creating new ones
- **Better Concurrency**: Multiple requests can be handled simultaneously
- **Efficient Resource Usage**: Minimum pool size ensures connections are always available

### 2. Scalability

- **Configurable Limits**: Max pool size prevents resource exhaustion
- **Auto-scaling**: Pool grows/shrinks based on demand
- **Load Distribution**: Secondary preferred reads distribute load

### 3. Reliability

- **Health Monitoring**: Continuous connection health checks
- **Timeout Protection**: Prevents hanging connections
- **Retry Logic**: Automatic retry for transient failures

## Database Indexes

Comprehensive index strategy for optimal query performance:

### Person Collection

- Tree IDs index
- Name indexes (given_name, surname)
- Date indexes (birth_date_exact, death_date_exact)
- Text search index for full-text searches
- Compound indexes for complex queries

### Relationships Collection

- Tree ID and person ID indexes
- Relationship type indexes
- Compound indexes for relationship queries

### Events Collection

- Tree ID and person ID indexes
- Event type and date indexes
- Place-based indexes

### History Collections

- Person ID and version indexes
- Changed by user indexes
- Timestamp indexes

## Configuration Best Practices

### Production Settings

```python
MONGODB_MIN_POOL_SIZE = 10      # Ensure always-available connections
MONGODB_MAX_POOL_SIZE = 100     # Prevent resource exhaustion
MONGODB_MAX_IDLE_TIME_MS = 30000 # Balance resource usage vs availability
```

### Development Settings

```python
MONGODB_MIN_POOL_SIZE = 5       # Lower resource usage
MONGODB_MAX_POOL_SIZE = 20      # Sufficient for development
MONGODB_MAX_IDLE_TIME_MS = 15000 # Faster cleanup
```

## Troubleshooting

### Common Issues

1. **Connection Exhaustion**: Check max pool size and connection leaks
2. **Slow Queries**: Monitor index usage and query patterns
3. **Timeout Errors**: Adjust timeout settings based on network conditions

### Monitoring Commands

```bash
# Check connection pool stats
curl -s "http://localhost:3004/health/pool" | jq '.'

# Check database health
curl -s "http://localhost:3004/health/database" | jq '.'

# Test concurrent connections
for i in {1..10}; do curl -s "http://localhost:3004/health/pool" | jq '.connections.current' & done; wait
```

## Summary

The MongoDB connection pooling implementation provides:

- ✅ **Optimal Performance**: Efficient connection reuse and management
- ✅ **High Concurrency**: Support for multiple simultaneous requests
- ✅ **Comprehensive Monitoring**: Real-time health and performance metrics
- ✅ **Production Ready**: Configurable settings for different environments
- ✅ **Reliability**: Timeout protection and retry logic

The system is now fully optimized for production use with proper connection pooling, monitoring, and performance optimizations.
