#!/bin/bash

# Environment Configuration Validation Script
# This script checks for common issues in environment configuration files

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 Validating Environment Configuration..."
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
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if file exists
check_file_exists() {
    local file=$1
    local description=$2
    
    if [[ -f "$file" ]]; then
        print_status "$GREEN" "✅ $description exists: $file"
        return 0
    else
        print_status "$RED" "❌ $description missing: $file"
        return 1
    fi
}

# Function to check for placeholder values
check_placeholders() {
    local file=$1
    local description=$2
    
    if [[ ! -f "$file" ]]; then
        return 1
    fi
    
    local placeholders=(
        "CHANGE_THIS_TO_YOUR"
        "your-super-secret"
        "PLACEHOLDER"
        "EXAMPLE"
        "TEMPLATE"
    )
    
    local found_placeholders=()
    
    for placeholder in "${placeholders[@]}"; do
        if grep -q "$placeholder" "$file"; then
            found_placeholders+=("$placeholder")
        fi
    done
    
    if [[ ${#found_placeholders[@]} -gt 0 ]]; then
        print_status "$YELLOW" "⚠️  $description contains placeholder values:"
        for placeholder in "${found_placeholders[@]}"; do
            echo "    - $placeholder"
        done
        return 1
    else
        print_status "$GREEN" "✅ $description has no placeholder values"
        return 0
    fi
}

# Function to check for duplicate variables
check_duplicates() {
    local file=$1
    local description=$2
    
    if [[ ! -f "$file" ]]; then
        return 1
    fi
    
    local duplicates=$(grep -E '^[A-Z_]+=.*' "$file" | cut -d'=' -f1 | sort | uniq -d)
    
    if [[ -n "$duplicates" ]]; then
        print_status "$RED" "❌ $description contains duplicate variables:"
        echo "$duplicates" | while read -r var; do
            echo "    - $var"
        done
        return 1
    else
        print_status "$GREEN" "✅ $description has no duplicate variables"
        return 0
    fi
}

# Function to validate JWT secrets consistency
check_jwt_consistency() {
    local files=(".env" "backend-service/.env" "auth-service/.env")
    local jwt_secrets=()
    local jwt_refresh_secrets=()
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            local jwt_secret=$(grep -E '^JWT_SECRET=' "$file" 2>/dev/null | cut -d'=' -f2- || echo "")
            local jwt_refresh=$(grep -E '^JWT_REFRESH_SECRET=' "$file" 2>/dev/null | cut -d'=' -f2- || echo "")
            
            if [[ -n "$jwt_secret" ]]; then
                jwt_secrets+=("$file:$jwt_secret")
            fi
            if [[ -n "$jwt_refresh" ]]; then
                jwt_refresh_secrets+=("$file:$jwt_refresh")
            fi
        fi
    done
    
    # Check JWT_SECRET consistency
    local unique_jwt_secrets=$(printf '%s\n' "${jwt_secrets[@]}" | cut -d':' -f2 | sort | uniq | wc -l)
    if [[ $unique_jwt_secrets -gt 1 ]]; then
        print_status "$RED" "❌ JWT_SECRET values are inconsistent across files"
        return 1
    elif [[ $unique_jwt_secrets -eq 1 ]]; then
        print_status "$GREEN" "✅ JWT_SECRET values are consistent"
    fi
    
    # Check JWT_REFRESH_SECRET consistency
    local unique_refresh_secrets=$(printf '%s\n' "${jwt_refresh_secrets[@]}" | cut -d':' -f2 | sort | uniq | wc -l)
    if [[ $unique_refresh_secrets -gt 1 ]]; then
        print_status "$RED" "❌ JWT_REFRESH_SECRET values are inconsistent across files"
        return 1
    elif [[ $unique_refresh_secrets -eq 1 ]]; then
        print_status "$GREEN" "✅ JWT_REFRESH_SECRET values are consistent"
    fi
    
    return 0
}

# Main validation
echo "📋 Checking required files..."
echo ""

# Check main environment files
error_count=0

check_file_exists ".env" "Main environment file" || ((error_count++))
check_file_exists ".env.example" "Environment template" || ((error_count++))
check_file_exists ".env.development" "Development environment" || ((error_count++))
check_file_exists ".env.production" "Production environment" || ((error_count++))

echo ""
echo "📋 Checking service environment files..."
echo ""

# Check service environment files
services=("auth-service" "backend-service" "genealogy-service" "search-service" "storage-service")
for service in "${services[@]}"; do
    check_file_exists "$service/.env" "$service environment file" || ((error_count++))
done

echo ""
echo "🔍 Checking for placeholder values..."
echo ""

# Check for placeholder values in actual .env files
env_files=(".env" "backend-service/.env" "auth-service/.env" "genealogy-service/.env" "search-service/.env" "storage-service/.env")
for file in "${env_files[@]}"; do
    if [[ -f "$file" ]]; then
        check_placeholders "$file" "$(basename "$(dirname "$file")")/$(basename "$file")" || ((error_count++))
    fi
done

echo ""
echo "🔍 Checking for duplicate variables..."
echo ""

# Check for duplicate variables
for file in "${env_files[@]}"; do
    if [[ -f "$file" ]]; then
        check_duplicates "$file" "$(basename "$(dirname "$file")")/$(basename "$file")" || ((error_count++))
    fi
done

echo ""
echo "🔍 Checking JWT secret consistency..."
echo ""

# Check JWT consistency
check_jwt_consistency || ((error_count++))

echo ""
echo "📊 Validation Summary"
echo "===================="

if [[ $error_count -eq 0 ]]; then
    print_status "$GREEN" "✅ All environment configuration checks passed!"
    echo ""
    print_status "$BLUE" "💡 Your environment configuration is properly set up."
    exit 0
else
    print_status "$RED" "❌ Found $error_count configuration issues"
    echo ""
    print_status "$YELLOW" "💡 Please review the issues above and fix them before proceeding."
    print_status "$YELLOW" "   Refer to docs/ENVIRONMENT_CONFIGURATION.md for guidance."
    exit 1
fi
