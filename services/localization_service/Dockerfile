# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/localization_service/go.mod services/localization_service/go.sum /app/services/localization_service/

# Download dependencies
WORKDIR /app/services/localization_service
RUN go mod download

# Copy source code
COPY services/localization_service /app/services/localization_service

# Build
RUN go build -o /localization_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /localization_service /app/localization_service

# Expose port
EXPOSE 8008

CMD ["/app/localization_service"]
