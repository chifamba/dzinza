# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/analytics_service/go.mod services/analytics_service/go.sum /app/services/analytics_service/

# Download dependencies
WORKDIR /app/services/analytics_service
RUN go mod download

# Copy source code
COPY services/analytics_service /app/services/analytics_service

# Build
RUN go build -o /analytics_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /analytics_service /app/analytics_service

# Expose port
EXPOSE 8001

CMD ["/app/analytics_service"]
