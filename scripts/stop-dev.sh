#!/bin/bash
# Stop development environment

echo "Stopping Dzinza development environment..."

# Stop all containers
docker-compose down

# Kill any running Node processes
pkill -f "npm run dev" || true
pkill -f "nodemon" || true

echo "Development environment stopped."
