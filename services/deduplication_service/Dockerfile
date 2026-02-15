# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/deduplication_service/go.mod services/deduplication_service/go.sum /app/services/deduplication_service/

# Download dependencies
WORKDIR /app/services/deduplication_service
RUN go mod download

# Copy source code
COPY services/deduplication_service /app/services/deduplication_service

# Build
RUN go build -o /deduplication_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /deduplication_service /app/deduplication_service

# Expose port
EXPOSE 8005

CMD ["/app/deduplication_service"]
