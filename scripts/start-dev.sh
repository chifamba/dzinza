#!/bin/bash
# Start development environment

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Navigate to the project root
cd "$PROJECT_ROOT" || { echo "Failed to navigate to project root: $PROJECT_ROOT"; exit 1; }

echo "Starting Dzinza development environment (from $PWD)..."

# Start backend services
# docker-compose.yml is expected in the current directory (project root)
docker-compose up -d postgres redis mongodb elasticsearch

# Wait for services
sleep 15

echo "Installing backend dependencies..."
(cd backend-service && npm install)

echo "Starting backend in development mode..."
# Runs in a subshell, backgrounded. CWD of main script is not affected.
(cd backend-service && npm run dev) &

echo "Installing frontend dependencies..."
(cd frontend && npm install)

echo "Starting frontend in development mode..."
# CWD is project root.
cd frontend && npm run dev

echo "Development environment is running!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo "API Docs: http://localhost:3001/api/docs"
