# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/community_marketplace_service/go.mod services/community_marketplace_service/go.sum /app/services/community_marketplace_service/

# Download dependencies
WORKDIR /app/services/community_marketplace_service
RUN go mod download

# Copy source code
COPY services/community_marketplace_service /app/services/community_marketplace_service

# Build
RUN go build -o /community_marketplace_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /community_marketplace_service /app/community_marketplace_service

# Expose port
EXPOSE 8004

CMD ["/app/community_marketplace_service"]
