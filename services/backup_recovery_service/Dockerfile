# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/backup_recovery_service/go.mod services/backup_recovery_service/go.sum /app/services/backup_recovery_service/

# Download dependencies
WORKDIR /app/services/backup_recovery_service
RUN go mod download

# Copy source code
COPY services/backup_recovery_service /app/services/backup_recovery_service

# Build
RUN go build -o /backup_recovery_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /backup_recovery_service /app/backup_recovery_service

# Expose port
EXPOSE 8016

CMD ["/app/backup_recovery_service"]
