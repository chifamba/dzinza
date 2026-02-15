# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy shared pkg first
COPY services/pkg /app/services/pkg

# Copy service go.mod and go.sum
COPY services/graph_query_service/go.mod services/graph_query_service/go.sum /app/services/graph_query_service/

# Download dependencies
WORKDIR /app/services/graph_query_service
RUN go mod download

# Copy source code
COPY services/graph_query_service /app/services/graph_query_service

# Build
RUN go build -o /graph_query_service ./cmd/main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /graph_query_service /app/graph_query_service

# Expose port
EXPOSE 8007

CMD ["/app/graph_query_service"]
