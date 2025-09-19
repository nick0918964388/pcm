#!/bin/bash

# PCM Photo Management System - Environment Test Script
# This script tests if the Docker environment is properly set up

echo "🚀 PCM Photo Management System - Environment Test"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Checking $service_name... "
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
        if [ "$response" -eq "$expected_status" ]; then
            echo -e "${GREEN}✓ OK${NC}"
            return 0
        else
            echo -e "${RED}✗ FAILED (HTTP $response)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}! SKIPPED (curl not available)${NC}"
        return 2
    fi
}

# Function to check Docker service
check_docker_service() {
    local service_name=$1
    
    echo -n "Checking Docker service $service_name... "
    
    if docker-compose ps | grep -q "$service_name.*Up"; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

echo ""
echo "1. Checking Docker services..."
echo "------------------------------"

check_docker_service "oracle-xe"
check_docker_service "redis"
check_docker_service "backend"
check_docker_service "frontend"
check_docker_service "celery-worker"

echo ""
echo "2. Checking service endpoints..."
echo "--------------------------------"

check_service "Backend Health Check" "http://localhost:8000/health" 200
check_service "Frontend" "http://localhost:3000" 200
check_service "API Documentation" "http://localhost:8000/docs" 200
check_service "Celery Flower" "http://localhost:5555" 200

echo ""
echo "3. Checking database connectivity..."
echo "-----------------------------------"

if docker-compose exec -T backend python -c "
import oracledb
from src.config import get_settings
settings = get_settings()
try:
    conn = oracledb.connect(
        user=settings.database_user,
        password=settings.database_password,
        host=settings.database_host,
        port=settings.database_port,
        service_name=settings.database_name
    )
    cursor = conn.cursor()
    cursor.execute('SELECT 1 FROM DUAL')
    cursor.fetchone()
    cursor.close()
    conn.close()
    print('Database connection: SUCCESS')
    exit(0)
except Exception as e:
    print(f'Database connection: FAILED - {e}')
    exit(1)
" 2>/dev/null; then
    echo -e "Database connectivity: ${GREEN}✓ OK${NC}"
else
    echo -e "Database connectivity: ${RED}✗ FAILED${NC}"
fi

echo ""
echo "4. Checking Redis connectivity..."
echo "--------------------------------"

if docker-compose exec -T backend python -c "
import redis
from src.config import get_settings
settings = get_settings()
try:
    r = redis.from_url(settings.redis_connection_string)
    r.ping()
    print('Redis connection: SUCCESS')
    exit(0)
except Exception as e:
    print(f'Redis connection: FAILED - {e}')
    exit(1)
" 2>/dev/null; then
    echo -e "Redis connectivity: ${GREEN}✓ OK${NC}"
else
    echo -e "Redis connectivity: ${RED}✗ FAILED${NC}"
fi

echo ""
echo "5. Checking Celery worker..."
echo "---------------------------"

if docker-compose exec -T celery-worker celery -A src.celery_app inspect ping 2>/dev/null | grep -q "OK"; then
    echo -e "Celery worker: ${GREEN}✓ OK${NC}"
else
    echo -e "Celery worker: ${RED}✗ FAILED${NC}"
fi

echo ""
echo "6. System resources..."
echo "---------------------"

echo "Docker containers:"
docker-compose ps

echo ""
echo "Docker resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

echo ""
echo "=================================================="
echo "Environment test completed!"
echo ""
echo "📚 Quick links:"
echo "   Frontend:     http://localhost:3000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/health"
echo "   Flower:       http://localhost:5555"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:    docker-compose logs -f [service]"
echo "   Restart:      docker-compose restart [service]"
echo "   Shell access: docker-compose exec [service] bash"
echo "=================================================="