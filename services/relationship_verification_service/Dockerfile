# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/relationship_verification_service/go.mod services/relationship_verification_service/go.sum /app/services/relationship_verification_service/

# Download dependencies
WORKDIR /app/services/relationship_verification_service
RUN go mod download

# Copy source code
COPY services/relationship_verification_service /app/services/relationship_verification_service

# Build
RUN go build -o /relationship_verification_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /relationship_verification_service /app/relationship_verification_service

# Expose port
EXPOSE 8011

CMD ["/app/relationship_verification_service"]
