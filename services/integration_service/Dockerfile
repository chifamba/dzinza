# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/integration_service/go.mod services/integration_service/go.sum /app/services/integration_service/

# Download dependencies
WORKDIR /app/services/integration_service
RUN go mod download

# Copy source code
COPY services/integration_service /app/services/integration_service

# Build
RUN go build -o /integration_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /integration_service /app/integration_service

# Expose port
EXPOSE 8017

CMD ["/app/integration_service"]
