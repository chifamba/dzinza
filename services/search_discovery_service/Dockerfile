# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/search_discovery_service/go.mod services/search_discovery_service/go.sum /app/services/search_discovery_service/

# Download dependencies
WORKDIR /app/services/search_discovery_service
RUN go mod download

# Copy source code
COPY services/search_discovery_service /app/services/search_discovery_service

# Build
RUN go build -o /search_discovery_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /search_discovery_service /app/search_discovery_service

# Expose port
EXPOSE 8012

CMD ["/app/search_discovery_service"]
