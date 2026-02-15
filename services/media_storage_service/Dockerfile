# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy the shared package first
COPY services/pkg /services/pkg

# Copy the service code
COPY services/media_storage_service /services/media_storage_service

WORKDIR /services/media_storage_service

# Build the application
RUN go build -o /app/media_storage_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/media_storage_service .

# Install necessary libraries for EXIF extraction if any (go-exif is pure go usually)
# Create a non-root user
RUN adduser -D dzinza
USER dzinza

EXPOSE 8009

CMD ["./media_storage_service"]
