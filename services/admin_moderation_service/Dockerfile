# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/admin_moderation_service/go.mod services/admin_moderation_service/go.sum /app/services/admin_moderation_service/

# Download dependencies
WORKDIR /app/services/admin_moderation_service
RUN go mod download

# Copy source code
COPY services/admin_moderation_service /app/services/admin_moderation_service

# Build
RUN go build -o /admin_moderation_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /admin_moderation_service /app/admin_moderation_service

# Expose port
EXPOSE 8000

CMD ["/app/admin_moderation_service"]
