# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/trust_access_control_service/go.mod services/trust_access_control_service/go.sum /app/services/trust_access_control_service/

# Download dependencies
WORKDIR /app/services/trust_access_control_service
RUN go mod download

# Copy source code
COPY services/trust_access_control_service /app/services/trust_access_control_service

# Build
RUN go build -o /trust_access_control_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /trust_access_control_service /app/trust_access_control_service

# Expose port
EXPOSE 8013

CMD ["/app/trust_access_control_service"]
