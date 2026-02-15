# ---- Build stage ----
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy shared pkg first (dependency layer)
COPY services/pkg /app/services/pkg

# Copy go.mod/go.sum for dependency caching
COPY services/backup_recovery_service/go.mod services/backup_recovery_service/go.sum /app/services/backup_recovery_service/

WORKDIR /app/services/backup_recovery_service
RUN go mod download

# Copy source and build a fully static binary
COPY services/backup_recovery_service /app/services/backup_recovery_service
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /backup_recovery_service ./cmd/main.go

# ---- Runtime stage (alpine for database CLI tools) ----
FROM alpine:3.21

RUN apk add --no-cache ca-certificates postgresql16-client mongodb-tools &&     rm -rf /var/cache/apk/*

# Non-root user
RUN adduser -D -u 10001 dzinza
USER dzinza

COPY --from=builder /backup_recovery_service /backup_recovery_service

EXPOSE 8020

ENTRYPOINT ["/backup_recovery_service"]
