# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy the shared package first
COPY services/pkg /services/pkg

# Copy the service code
COPY services/audit_history_service /services/audit_history_service

WORKDIR /services/audit_history_service

# Build the application
RUN go build -o /app/audit_history_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/audit_history_service .

# Create a non-root user
RUN adduser -D dzinza
USER dzinza

EXPOSE 8002

CMD ["./audit_history_service"]
