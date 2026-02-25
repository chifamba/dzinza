# ---- Build stage ----
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy shared pkg go.mod/go.sum (dependency layer)
COPY services/pkg/go.mod services/pkg/go.sum /app/services/pkg/

# Copy go.mod/go.sum for dependency caching
COPY services/genealogy_service/go.mod services/genealogy_service/go.sum /app/services/genealogy_service/

WORKDIR /app/services/genealogy_service
RUN go mod download

# Copy source and build a fully static binary
COPY services/pkg /app/services/pkg
COPY services/genealogy_service /app/services/genealogy_service
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /genealogy_service ./cmd/main.go

# ---- Runtime stage (scratch = binary only, zero attack surface) ----
FROM scratch

# TLS root certificates for outbound HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Non-root user (numeric UID for scratch)
USER 65534:65534

COPY --from=builder /genealogy_service /genealogy_service

EXPOSE 8006

ENTRYPOINT ["/genealogy_service"]
