# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/help_support_service/go.mod services/help_support_service/go.sum /app/services/help_support_service/

# Download dependencies
WORKDIR /app/services/help_support_service
RUN go mod download

# Copy source code
COPY services/help_support_service /app/services/help_support_service

# Build
RUN go build -o /help_support_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /help_support_service /app/help_support_service

# Expose port
EXPOSE 8014

CMD ["/app/help_support_service"]
