#!/bin/bash

# Environment Configuration Validation Script (Updated for Python/Docker Compose)
# This script checks for common issues in local environment configuration files,
# primarily the root .env file used by Docker Compose and the secrets directory.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

echo "🔍 Validating Local Environment Configuration for Dzinza (Python Backend)..."
echo "Project root: $PROJECT_ROOT"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Function to check if file exists
check_file_exists() {
    local file="$1"
    local description="$2"
    local is_critical="${3:-false}" # Optional 3rd arg, true if missing is a critical error
    
    if [[ -f "$file" ]]; then
        print_status "$GREEN" "✅ $description exists: $file"
        return 0
    else
        if [[ "$is_critical" == "true" ]]; then
            print_status "$RED" "❌ CRITICAL: $description missing: $file"
            return 1
        else
            print_status "$YELLOW" "⚠️  $description missing: $file (This might be okay depending on your setup)"
            return 0 # Not a failure for non-critical missing files like optional .env files
        fi
    fi
}

# Function to check if directory exists
check_dir_exists() {
    local dir="$1"
    local description="$2"
    local is_critical="${3:-false}"

    if [[ -d "$dir" ]]; then
        print_status "$GREEN" "✅ $description exists: $dir/"
        return 0
    else
        if [[ "$is_critical" == "true" ]]; then
            print_status "$RED" "❌ CRITICAL: $description missing: $dir/"
            return 1
        else
            print_status "$YELLOW" "⚠️  $description missing: $dir/"
            return 0
        fi
    fi
}


# Function to check for placeholder values in a file
check_placeholders() {
    local file="$1"
    local description="$2"
    
    if [[ ! -f "$file" ]]; then
        return 0 # Skip if file doesn't exist (existence check is separate)
    fi
    
    # Common placeholders to look for
    local placeholders=(
        "your_unified_jwt_secret"
        "your_unified_refresh_secret"
        "fallback_jwt_secret_please_change"
        "fallback_jwt_refresh_secret_please_change"
        "dzinza_secure_password_123"
        "mongo_secure_password_456"
        "redis_secure_password_789"
        "YOUR_SECRET"
        "YOUR_KEY"
        "__CHANGE_ME__"
        "PLACEHOLDER"
        "DEFAULT_FALLBACK" # Add any other common placeholders from your .env.example or secret baselines
    )
    
    local found_placeholders_in_file=()
    
    for placeholder in "${placeholders[@]}"; do
        # Check if placeholder exists as a value (i.e., after an equals sign)
        if grep -qE "^[^#]*=[^#]*${placeholder}" "$file"; then
            found_placeholders_in_file+=("$placeholder")
        fi
    done
    
    if [[ ${#found_placeholders_in_file[@]} -gt 0 ]]; then
        print_status "$YELLOW" "⚠️  $description ($file) may contain placeholder values for the following keys/patterns:"
        # Show lines with placeholders
        for placeholder in "${found_placeholders_in_file[@]}"; do
             grep -nE "^[^#]*=[^#]*${placeholder}" "$file" | sed "s/^/    Line /"
        done
        return 1
    else
        print_status "$GREEN" "✅ $description ($file) has no obvious placeholder values."
        return 0
    fi
}

# Function to check for duplicate variable definitions in a file
check_duplicates() {
    local file="$1"
    local description="$2"
    
    if [[ ! -f "$file" ]]; then
        return 0 # Skip if file doesn't exist
    fi
    
    # Extracts variable names (before '=') from non-commented lines
    local duplicates=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=.*' "$file" | cut -d'=' -f1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sort | uniq -d)
    
    if [[ -n "$duplicates" ]]; then
        print_status "$RED" "❌ $description ($file) contains duplicate variable definitions:"
        echo "$duplicates" | while read -r var; do
            echo "    - $var"
        done
        return 1
    else
        print_status "$GREEN" "✅ $description ($file) has no duplicate variable definitions."
        return 0
    fi
}

# Main validation
error_count=0
warning_count=0 # Not used to fail script, but for info

echo -e "\n📋 ${BLUE}Checking Core Configuration Files...${NC}"
check_file_exists ".env" "Root .env file (for Docker Compose)" "false" # Not critical if all vars are in compose file or system env
check_file_exists ".env.example" "Root .env.example template" "true" || ((error_count++))
check_dir_exists "./secrets" "Secrets directory (./secrets/)" "true" || ((error_count++))

# Check for a few key secret files (names from .secrets.baseline or docker-compose.yml)
if [ -d "./secrets" ]; then
    echo -e "\n📋 ${BLUE}Checking Key Secret Files in ./secrets/...${NC}"
    check_file_exists "./secrets/db_password.txt" "PostgreSQL DB password secret" "true" || ((error_count++))
    check_file_exists "./secrets/mongo_password.txt" "MongoDB password secret" "true" || ((error_count++))
    check_file_exists "./secrets/redis_password.txt" "Redis password secret" "true" || ((error_count++))
    check_file_exists "./secrets/jwt_secret.txt" "JWT secret" "true" || ((error_count++))
    check_file_exists "./secrets/jwt_refresh_secret.txt" "JWT refresh secret" "true" || ((error_count++))
fi

echo -e "\n📋 ${BLUE}Checking Optional Service-Level .env Files (for local non-Docker dev)...${NC}"
services=("auth-service" "backend-service" "genealogy-service" "search-service" "storage-service")
for service in "${services[@]}"; do
    check_file_exists "$service/.env" "$service local .env file" "false"
done

echo -e "\n🔍 ${BLUE}Checking for Placeholder Values in .env Files...${NC}"
# Check root .env if it exists
if [[ -f ".env" ]]; then
    check_placeholders ".env" "Root .env file" || ((error_count++))
fi
# Check service .env files if they exist
for service in "${services[@]}"; do
    if [[ -f "$service/.env" ]]; then
        check_placeholders "$service/.env" "$service local .env file" || ((error_count++))
    fi
done
# Note: This script doesn't check placeholders *inside* the ./secrets files themselves.
# Users should ensure actual secrets are placed there, not placeholders.

echo -e "\n🔍 ${BLUE}Checking for Duplicate Variables in .env Files...${NC}"
if [[ -f ".env" ]]; then
    check_duplicates ".env" "Root .env file" || ((error_count++))
fi
for service in "${services[@]}"; do
    if [[ -f "$service/.env" ]]; then
        check_duplicates "$service/.env" "$service local .env file" || ((error_count++))
    fi
done

echo -e "\n📊 ${BLUE}Validation Summary${NC}"
echo "===================="

if [[ $error_count -eq 0 ]]; then
    print_status "$GREEN" "✅ All critical environment configuration checks passed!"
    echo ""
    print_status "$BLUE" "💡 Review any warnings above. Ensure actual secrets are in ./secrets/ and that the root .env (if used) is configured correctly for your Docker Compose setup."
    print_status "$BLUE" "   Refer to docs/ENVIRONMENT_CONFIGURATION.md for detailed guidance."
    exit 0
else
    print_status "$RED" "❌ Found $error_count critical configuration issue(s)."
    echo ""
    print_status "$YELLOW" "💡 Please review the issues above and fix them before proceeding."
    print_status "$YELLOW" "   Refer to docs/ENVIRONMENT_CONFIGURATION.md for guidance."
    exit 1
fi
