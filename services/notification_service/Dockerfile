# ---- Build stage ----
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy shared pkg go.mod/go.sum (dependency layer)
COPY services/pkg/go.mod services/pkg/go.sum /app/services/pkg/

# Copy go.mod/go.sum for dependency caching
COPY services/notification_service/go.mod services/notification_service/go.sum /app/services/notification_service/

WORKDIR /app/services/notification_service
RUN go mod download

# Copy source and build a fully static binary
COPY services/pkg /app/services/pkg
COPY services/notification_service /app/services/notification_service
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /notification_service ./cmd/main.go

# ---- Runtime stage (scratch = binary only, zero attack surface) ----
FROM scratch

# TLS root certificates for outbound HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Non-root user (numeric UID for scratch)
USER 65534:65534

COPY --from=builder /notification_service /notification_service

EXPOSE 8010

ENTRYPOINT ["/notification_service"]
