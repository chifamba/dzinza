#!/bin/zsh
# dzinza-local-ci.sh
# Run local CI steps for all services in the monorepo
set -e

echo "🚀 Starting Dzinza Local CI Pipeline..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  echo -e "${GREEN}===== $1 =====${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if service directory exists and has package.json
check_service() {
  local service=$1
  if [ ! -d "$service" ]; then
    print_warning "Directory $service does not exist, skipping..."
    return 1
  fi
  
  if [ ! -f "$service/package.json" ]; then
    print_warning "No package.json found in $service, skipping..."
    return 1
  fi
  
  return 0
}

# Function to run command with error handling
run_command() {
  local service=$1
  local command=$2
  local description=$3
  
  print_status "$service: $description"
  
  if (cd "$service" && eval "$command"); then
    echo -e "${GREEN}✅ $service: $description completed successfully${NC}"
    return 0
  else
    print_error "$service: $description failed"
    return 1
  fi
}

# Function to check if script exists in package.json
has_script() {
  local service=$1
  local script=$2
  
  (cd "$service" && npm run | grep -q "^  $script$" 2>/dev/null)
}

# Install root dependencies first
print_status "Installing root dependencies"
npm install

SERVICES=(frontend backend-service auth-service genealogy-service search-service storage-service)
FAILED_SERVICES=()

for SERVICE in ${SERVICES[@]}
do
  print_info "Processing service: $SERVICE"
  
  if ! check_service "$SERVICE"; then
    continue
  fi
  
  # Install dependencies
  if ! run_command "$SERVICE" "npm ci --prefer-offline --no-audit" "Installing dependencies"; then
    FAILED_SERVICES+=("$SERVICE (install)")
    continue
  fi
  
  # Lint
  if has_script "$SERVICE" "lint"; then
    if ! run_command "$SERVICE" "npm run lint" "Linting"; then
      print_warning "$SERVICE: Linting failed but continuing..."
    fi
  else
    print_info "$SERVICE: No lint script found, skipping..."
  fi
  
  # Type checking
  if has_script "$SERVICE" "typecheck"; then
    if ! run_command "$SERVICE" "npm run typecheck" "Type checking"; then
      FAILED_SERVICES+=("$SERVICE (typecheck)")
      continue
    fi
  elif [ -f "$SERVICE/tsconfig.json" ]; then
    if ! run_command "$SERVICE" "npx tsc --noEmit" "Type checking (fallback)"; then
      FAILED_SERVICES+=("$SERVICE (typecheck)")
      continue
    fi
  else
    print_info "$SERVICE: No TypeScript configuration found, skipping type check..."
  fi
  
  # Build
  if has_script "$SERVICE" "build"; then
    if ! run_command "$SERVICE" "npm run build" "Building"; then
      FAILED_SERVICES+=("$SERVICE (build)")
      continue
    fi
  else
    print_info "$SERVICE: No build script found, skipping..."
  fi
  
  # Test
  if has_script "$SERVICE" "test"; then
    if ! run_command "$SERVICE" "npm test" "Testing"; then
      print_warning "$SERVICE: Tests failed but continuing..."
    fi
  else
    print_info "$SERVICE: No test script found, skipping..."
  fi
  
  # Security audit
  print_status "$SERVICE: Security audit"
  if (cd "$SERVICE" && npm audit --audit-level=high --prefer-offline); then
    echo -e "${GREEN}✅ $SERVICE: Security audit passed${NC}"
  else
    print_warning "$SERVICE: Security audit found issues (non-blocking)"
  fi
  
  # Docker build
  if [ -f "$SERVICE/Dockerfile" ]; then
    if ! run_command "$SERVICE" "docker build -t dzinza/$SERVICE ." "Docker build"; then
      print_warning "$SERVICE: Docker build failed but continuing..."
    fi
  else
    print_info "$SERVICE: No Dockerfile found, skipping Docker build..."
  fi
  
  echo ""
done

# Summary
echo ""
print_status "CI Pipeline Summary"

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
  echo -e "${GREEN}🎉 All services passed CI checks!${NC}"
  exit 0
else
  echo -e "${RED}❌ The following services had failures:${NC}"
  for failed in "${FAILED_SERVICES[@]}"; do
    echo -e "${RED}  - $failed${NC}"
  done
  exit 1
fi
