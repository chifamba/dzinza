# ---- Build stage ----
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy shared pkg first (dependency layer)
COPY services/pkg /app/services/pkg

# Copy go.mod/go.sum for dependency caching
COPY services/integration_service/go.mod services/integration_service/go.sum /app/services/integration_service/

WORKDIR /app/services/integration_service
RUN go mod download

# Copy source and build a fully static binary
COPY services/integration_service /app/services/integration_service
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /integration_service ./cmd/main.go

# ---- Runtime stage (scratch = binary only, zero attack surface) ----
FROM scratch

# TLS root certificates for outbound HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Non-root user (numeric UID for scratch)
USER 65534:65534

COPY --from=builder /integration_service /integration_service

EXPOSE 8017

ENTRYPOINT ["/integration_service"]
