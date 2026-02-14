# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/auth_service/go.mod services/auth_service/go.sum /app/services/auth_service/

# Download dependencies
WORKDIR /app/services/auth_service
RUN go mod download

# Copy source code
COPY services/auth_service /app/services/auth_service

# Build
RUN go build -o /auth_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /auth_service /app/auth_service

# Expose port
EXPOSE 8003

CMD ["/app/auth_service"]
