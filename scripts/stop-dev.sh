#!/bin/bash
# Dzinza: Stop Full Development Environment
# This script stops all backend/frontend dev servers and database containers started by start-dev.sh

set -e

# Colors for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Helper: portable pkill fallback
portable_kill() {
  PROC_PATTERN="$1"
  PROC_NAME="$2"
  if command -v pkill >/dev/null 2>&1; then
    pkill -f "$PROC_PATTERN" 2>/dev/null || true
  else
    # Fallback: use ps/grep/awk/kill (POSIX)
    PIDS=$(ps aux | grep "$PROC_PATTERN" | grep -v grep | awk '{print $2}')
    if [ -n "$PIDS" ]; then
      echo "$PIDS" | xargs kill 2>/dev/null || true
    fi
  fi
}

# 1. Stop frontend dev server (Vite)
echo -e "${YELLOW}Stopping frontend dev server...${NC}"
portable_kill "vite" "vite"

# 2. Stop backend-service (Node.js, if running)
echo -e "${YELLOW}Stopping backend-service (Node.js)...${NC}"
portable_kill "node.*backend-service" "backend-service"

# 3. Stop Python FastAPI services
echo -e "${YELLOW}Stopping Python FastAPI services...${NC}"
portable_kill "uvicorn.*auth-service" "auth-service"
portable_kill "uvicorn.*genealogy-service" "genealogy-service"
portable_kill "uvicorn.*search-service" "search-service"
portable_kill "uvicorn.*storage-service" "storage-service"

# 4. Stop database containers
echo -e "${YELLOW}Stopping database containers (docker-compose)...${NC}"
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose down
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose down
else
  echo "${YELLOW}Warning: docker-compose not found. Please stop containers manually.${NC}"
fi

echo -e "\n${GREEN}All dev services stopped.${NC}"
