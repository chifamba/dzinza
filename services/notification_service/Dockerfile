# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy the shared package first
COPY services/pkg /services/pkg

# Copy the service code
COPY services/notification_service /services/notification_service

WORKDIR /services/notification_service

# Build the application
RUN go build -o /app/notification_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/notification_service .

# Create a non-root user
RUN adduser -D dzinza
USER dzinza

EXPOSE 8010

CMD ["./notification_service"]
