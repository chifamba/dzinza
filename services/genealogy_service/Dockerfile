# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy the shared package first
COPY services/pkg /services/pkg

# Copy the service code
COPY services/genealogy_service /services/genealogy_service

WORKDIR /services/genealogy_service

# Build the application
RUN go build -o /app/genealogy_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/genealogy_service .

# Create a non-root user
RUN adduser -D dzinza
USER dzinza

EXPOSE 8006

CMD ["./genealogy_service"]
