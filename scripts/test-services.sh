#!/bin/bash

# Test Docker Services for PCM Photo Management System

echo "🔍 Testing Docker Services..."
echo "================================"

# Function to check service
check_service() {
    local service_name=$1
    local port=$2
    local description=$3

    echo -n "Checking $description (port $port)... "

    if nc -zv localhost $port 2>/dev/null; then
        echo "✅ Running"
        return 0
    else
        echo "❌ Not available"
        return 1
    fi
}

# Check Oracle Database
check_service "oracle-db" 1521 "Oracle Database"

# Check Redis
check_service "redis" 6379 "Redis Cache"

# Check Backend API
check_service "backend" 8000 "FastAPI Backend"

# Check Frontend
check_service "frontend" 3000 "React Frontend"

# Check Flower (optional)
check_service "flower" 5555 "Celery Flower Monitor"

echo ""
echo "================================"
echo "✅ Service check complete!"
echo ""
echo "To view logs: docker-compose logs -f [service-name]"
echo "To stop all services: docker-compose down"