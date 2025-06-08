#!/bin/bash
# Start development environment

echo "Starting Dzinza development environment..."

# Start backend services
docker-compose up -d postgres redis mongodb elasticsearch

# Wait for services
sleep 15

# Start backend in development mode
cd backend && npm run dev &

# Start frontend in development mode
npm run dev

echo "Development environment is running!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo "API Docs: http://localhost:3001/api/docs"
