# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/ai_moderation_service/go.mod services/ai_moderation_service/go.sum /app/services/ai_moderation_service/

# Download dependencies
WORKDIR /app/services/ai_moderation_service
RUN go mod download

# Copy source code
COPY services/ai_moderation_service /app/services/ai_moderation_service

# Build
RUN go build -o /ai_moderation_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /ai_moderation_service /app/ai_moderation_service

# Expose port
EXPOSE 8015

CMD ["/app/ai_moderation_service"]
