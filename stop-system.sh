#!/bin/bash

# MEDUCO Healthcare Platform - Stop Script

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${RED}🛑 $1${NC}"
}

print_header "Stopping MEDUCO Healthcare Platform"

# Kill backend
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        print_status "Backend server stopped (PID: $BACKEND_PID)"
    fi
    rm -f backend.pid
fi

# Kill frontend
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        print_status "Frontend server stopped (PID: $FRONTEND_PID)"
    fi
    rm -f frontend.pid
fi

# Kill any remaining processes on our ports
lsof -ti:3001 | xargs -r kill -9 2>/dev/null
lsof -ti:8080 | xargs -r kill -9 2>/dev/null

print_status "All services stopped"
