# Dzinza Microservices

This directory contains all Go microservices for the Dzinza platform.

## Structure

Each service follows the standard Go project layout:

```
services/
├── pkg/                       # Shared Go packages
│   ├── logging/               # Structured logging (slog/zerolog)
│   ├── health/                # GET /health handler
│   ├── auth/                  # JWT middleware
│   ├── config/                # Config loader (env vars + Docker secrets)
│   └── response/              # JSON response helpers
├── auth_service/              # Port 8003
├── genealogy_service/         # Port 8006
├── media_storage_service/     # Port 8009
├── notification_service/      # Port 8010
├── search_discovery_service/  # Port 8012
└── .../                       # See Full_Requirements_Spec.md for complete list
```

## Service Template

To create a new service:

```bash
mkdir -p services/<name>/cmd services/<name>/internal/{handlers,models,repository,service,middleware}
cd services/<name>
go mod init github.com/chifamba/dzinza/services/<name>
```

## Building & Running

### Docker (Recommended)

All services should be built and run using Docker to ensure environment consistency.

```bash
# Build and run all services
docker-compose up --build

# Build a single service
docker build -f services/<name>/Dockerfile -t dzinza-<name> .
```

### Local Development (Not Recommended for Builds)

If you need to run or test locally during development:

```bash
# Run locally
cd services/<name> && go run cmd/main.go

# Build a local binary (for debugging only)
cd services/<name> && go build -o bin/<name> cmd/main.go
```
