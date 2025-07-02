#!/bin/bash
# Start Dzinza development environment (Python Backend + React Frontend)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Navigate to the project root
cd "$PROJECT_ROOT" || { echo "Failed to navigate to project root: $PROJECT_ROOT"; exit 1; }

echo "Current directory: $(pwd)"
echo "Ensuring Node.js dependencies for frontend are installed..."

# Check if frontend directory and package.json exist
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
  echo "Installing/updating frontend dependencies (if needed)..."
  (cd frontend && npm install)
  if [ $? -ne 0 ]; then
    echo "Frontend npm install failed. Please check errors."
    # exit 1 # Optionally exit if frontend setup is critical before compose
  fi
else
  echo "WARNING: Frontend directory or frontend/package.json not found. Skipping frontend npm install step."
  echo "The frontend service might fail to start if its Docker image doesn't handle dependency installation."
fi

# 0. Validate environment and secrets before starting
if [ -f "$SCRIPT_DIR/validate-env.sh" ]; then
  echo "\nValidating environment configuration..."
  bash "$SCRIPT_DIR/validate-env.sh" || { echo "Environment validation failed. Aborting startup."; exit 1; }
else
  echo "WARNING: validate-env.sh not found. Skipping environment validation."
fi

# 0.1 Check for Docker
if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker is not installed or not in PATH. Please install Docker Desktop or Docker Engine."
  exit 1
fi

# 0.2 Check for Docker Compose
if ! docker compose version &>/dev/null && ! docker-compose version &>/dev/null; then
  echo "ERROR: Docker Compose is not installed or not in PATH."
  echo "Install Docker Compose v2 (preferred) or v1. See https://docs.docker.com/compose/install/"
  exit 1
fi

# 0.3 Check if required ports are free (warn, don't fail)
REQUIRED_PORTS=(8080 3001 3002 3003 3004 3005 5432 27017 6379 9200 3300 9090 3900 3901)
for port in "${REQUIRED_PORTS[@]}"; do
  if lsof -i :$port &>/dev/null; then
    echo "WARNING: Port $port appears to be in use. This may cause a service to fail to start."
  fi
done

echo ""
echo "Starting all Dzinza services via Docker Compose..."
echo "This will build images if they don't exist or if code has changed."
echo "Services will run in detached mode (-d). View logs with 'docker-compose logs -f'."

# Start all services defined in docker-compose.yml
# --build: Rebuild images if their Dockerfile or context has changed.
# -d: Run in detached mode.
docker-compose up --build -d

# Check the exit code of docker-compose up
if [ $? -ne 0 ]; then
  echo "-----------------------------------------------------"
  echo "ERROR: 'docker-compose up' command failed."
  echo "Please check the output above for error messages."
  echo "Common issues:"
  echo "  - Docker daemon not running."
  echo "  - Errors in Dockerfiles or docker-compose.yml."
  echo "  - Port conflicts if services try to use ports already in use on the host."
  echo "  - Missing secret files in the ./secrets directory (refer to .secrets.baseline)."
  echo "  - Incorrect variables in the root .env file."
  echo "-----------------------------------------------------"
  exit 1
fi

echo ""
echo "Dzinza development environment services are starting up in the background."
echo "------------------------------------------------------------------------"
echo "Key services and access points (ports might vary based on your .env file):"
echo ""
echo "- Frontend (React App):      http://localhost:${FRONTEND_PORT:-8080}"
echo "  (or http://dzinza.local if local DNS/proxy is configured)"
echo ""
echo "- API Gateway:               http://localhost:${GATEWAY_PORT:-3001}"
echo "  (All backend API requests should go through the gateway)"
echo ""
echo "- Python Service Access (via Gateway - examples):"
echo "  - Auth Service:          http://localhost:${GATEWAY_PORT:-3001}/api/v1/auth/docs"
echo "  - Genealogy Service:     http://localhost:${GATEWAY_PORT:-3001}/api/v1/family-trees/docs (example, check service for actual doc path)"
echo "  - Storage Service:       http://localhost:${GATEWAY_PORT:-3001}/api/v1/files/docs"
echo "  - Search Service:        http://localhost:${GATEWAY_PORT:-3001}/api/v1/search/docs"
echo ""
echo "Individual Python services also expose their own ports (e.g., auth_service_py on ${AUTH_SERVICE_PORT:-3002}),"
echo "but these are typically for internal communication or direct debugging, not primary user access."
echo ""
echo "------------------------------------------------------------------------"
echo "Monitoring & Management:"
echo "- To view logs for all services:         docker-compose logs -f"
echo "- To view logs for a specific service:   docker-compose logs -f <service_name>"
echo "  (e.g., docker-compose logs -f auth_service_py)"
echo "- To see running containers:             docker-compose ps"
echo "- To stop all services:                docker-compose down"
echo "- To stop and remove volumes:          docker-compose down -v"
echo "------------------------------------------------------------------------"
echo "Setup complete! It might take a few moments for all services to be fully available."
