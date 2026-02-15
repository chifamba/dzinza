# ---- Build stage ----
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy shared pkg first (dependency layer)
COPY services/pkg /app/services/pkg

# Copy go.mod/go.sum for dependency caching
COPY services/trust_access_control_service/go.mod services/trust_access_control_service/go.sum /app/services/trust_access_control_service/

WORKDIR /app/services/trust_access_control_service
RUN go mod download

# Copy source and build a fully static binary
COPY services/trust_access_control_service /app/services/trust_access_control_service
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /trust_access_control_service ./cmd/main.go

# ---- Runtime stage (scratch = binary only, zero attack surface) ----
FROM scratch

# TLS root certificates for outbound HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Non-root user (numeric UID for scratch)
USER 65534:65534

COPY --from=builder /trust_access_control_service /trust_access_control_service

EXPOSE 8013

ENTRYPOINT ["/trust_access_control_service"]
