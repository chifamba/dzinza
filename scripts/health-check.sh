#!/bin/bash

# Dzinza Platform Health Check Script
# This script performs comprehensive health checks on all services

set -e

echo "🏥 Dzinza Platform Health Check"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check HTTP endpoint
check_http() {
    local service=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "  Checking $service... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null); then
        if [ "$response" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ Healthy${NC} ($response)"
            return 0
        else
            echo -e "${RED}❌ Unhealthy${NC} ($response)"
            return 1
        fi
    else
        echo -e "${RED}❌ Unreachable${NC}"
        return 1
    fi
}

# Function to check Docker service
check_docker_service() {
    local service=$1
    local container_name=$2
    
    echo -n "  Checking $service container... "
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*Up"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not running${NC}"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    local db_type=$1
    local check_command=$2
    
    echo -n "  Checking $db_type connectivity... "
    
    if eval "$check_command" &>/dev/null; then
        echo -e "${GREEN}✅ Connected${NC}"
        return 0
    else
        echo -e "${RED}❌ Connection failed${NC}"
        return 1
    fi
}

# Initialize counters
total_checks=0
passed_checks=0

echo ""
echo "🐳 Docker Container Status"
echo "=========================="
services=(
    "PostgreSQL:postgres"
    "MongoDB:mongodb"
    "Redis:redis"
    "Elasticsearch:elasticsearch"
    "Frontend:dzinza-frontend"
    "Backend Gateway:dzinza-backend-service"
    "Auth Service:dzinza-auth-service"
    "Genealogy Service:dzinza-genealogy-service"
    "Search Service:dzinza-search-service"
    "Storage Service:dzinza-storage-service"
    "Garage1:dzinza-garage1"
    "Garage2:dzinza-garage2"
    "Garage3:dzinza-garage3"
    "Prometheus:prometheus"
    "Grafana:grafana"
)

for service in "${services[@]}"; do
    IFS=':' read -r name container <<< "$service"
    check_docker_service "$name" "$container"
    total_checks=$((total_checks + 1))
    if [ $? -eq 0 ]; then
        passed_checks=$((passed_checks + 1))
    fi
done

echo ""
echo "🔌 Database Connectivity"
echo "======================="
check_database "PostgreSQL" "docker-compose exec -T postgres pg_isready -U dzinza_user -d dzinza_db"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_database "MongoDB" "docker-compose exec -T mongodb mongosh --quiet --eval 'db.adminCommand(\"ping\")'"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_database "Redis" "docker-compose exec -T redis redis-cli -a redis_secure_password_789 ping"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

echo ""
echo "🌐 Service Health Endpoints"
echo "=========================="
check_http "Frontend" "http://localhost:8080"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_http "Backend Gateway" "http://localhost:3000/api/v1/gateway/health"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_http "Auth Service" "http://localhost:3002/health"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_http "Genealogy Service" "http://localhost:3004/health"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_http "Search Service" "http://localhost:3003/health"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_http "Storage Service" "http://localhost:3005/health"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_http "Elasticsearch" "http://localhost:9200/_cluster/health"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_http "Prometheus" "http://localhost:9090/-/healthy"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

check_http "Grafana" "http://localhost:3300/api/health"
total_checks=$((total_checks + 1))
if [ $? -eq 0 ]; then passed_checks=$((passed_checks + 1)); fi

echo ""
echo "🔧 System Status"
echo "==============="
echo -n "  Docker Compose Status... "
if docker-compose ps --quiet | wc -l | grep -q "16"; then
    echo -e "${GREEN}✅ All services running${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "${YELLOW}⚠️  Some services may be down${NC}"
fi
total_checks=$((total_checks + 1))

echo -n "  Elasticsearch Cluster Health... "
if es_health=$(curl -s "http://localhost:9200/_cluster/health" | jq -r .status 2>/dev/null); then
    case $es_health in
        "green")
            echo -e "${GREEN}✅ Green${NC}"
            passed_checks=$((passed_checks + 1))
            ;;
        "yellow")
            echo -e "${YELLOW}⚠️  Yellow${NC}"
            passed_checks=$((passed_checks + 1))
            ;;
        "red")
            echo -e "${RED}❌ Red${NC}"
            ;;
        *)
            echo -e "${RED}❌ Unknown${NC}"
            ;;
    esac
else
    echo -e "${RED}❌ Cannot determine${NC}"
fi
total_checks=$((total_checks + 1))

echo ""
echo "📊 Resource Usage"
echo "================"
echo "  Container Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -n 6

echo ""
echo "🎯 Health Check Summary"
echo "======================"
echo "  Total Checks: $total_checks"
echo "  Passed: $passed_checks"
echo "  Failed: $((total_checks - passed_checks))"

if [ $passed_checks -eq $total_checks ]; then
    echo -e "  Overall Status: ${GREEN}🟢 All Systems Healthy${NC}"
    exit 0
elif [ $passed_checks -gt $((total_checks * 3 / 4)) ]; then
    echo -e "  Overall Status: ${YELLOW}🟡 Mostly Healthy${NC}"
    exit 1
else
    echo -e "  Overall Status: ${RED}🔴 Multiple Issues Detected${NC}"
    exit 2
fi
