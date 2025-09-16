#!/bin/bash

# MEDUCO Healthcare Platform - Complete System Startup Script
# This script starts PostgreSQL, Backend, and Frontend services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
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

print_header() {
    echo -e "${PURPLE}🏥 $1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null
        print_info "Killed process on port $port"
    fi
}

# Function to wait for service to start
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0

    print_info "Waiting for $service_name to start on port $port..."

    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            print_status "$service_name is running on port $port"
            return 0
        fi

        sleep 1
        attempt=$((attempt + 1))
        echo -n "."
    done

    echo
    print_error "$service_name failed to start on port $port after $max_attempts seconds"
    return 1
}

# Function to check PostgreSQL status
check_postgresql() {
    if command_exists psql; then
        print_status "PostgreSQL client found"

        # Try to connect to test if server is running
        if psql -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
            print_status "PostgreSQL server is running"
            return 0
        else
            print_warning "PostgreSQL server is not running"
            return 1
        fi
    else
        print_error "PostgreSQL not found"
        return 1
    fi
}

# Function to start PostgreSQL
start_postgresql() {
    print_header "Starting PostgreSQL Database"

    if check_postgresql; then
        print_status "PostgreSQL is already running"
        return 0
    fi

    print_info "Attempting to start PostgreSQL..."

    # Try different methods based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew services start postgresql@14 2>/dev/null || \
            brew services start postgresql 2>/dev/null
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo systemctl start postgresql 2>/dev/null || \
        sudo service postgresql start 2>/dev/null
    fi

    # Wait and check again
    sleep 3
    if check_postgresql; then
        print_status "PostgreSQL started successfully"
        return 0
    else
        print_error "Failed to start PostgreSQL automatically"
        print_info "Please start PostgreSQL manually:"
        print_info "  macOS: brew services start postgresql"
        print_info "  Linux: sudo systemctl start postgresql"
        print_info "  Windows: Start PostgreSQL service from Services panel"
        return 1
    fi
}

# Function to check database exists
check_database() {
    print_info "Checking if meduco database exists..."

    if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw meduco; then
        print_status "Database 'meduco' exists"
        return 0
    else
        print_warning "Database 'meduco' does not exist"
        return 1
    fi
}

# Function to create database
create_database() {
    print_info "Creating meduco database..."

    if createdb meduco -U postgres 2>/dev/null; then
        print_status "Database 'meduco' created successfully"
        return 0
    else
        print_error "Failed to create database 'meduco'"
        print_info "Please create it manually: createdb meduco -U postgres"
        return 1
    fi
}

# Function to start backend
start_backend() {
    print_header "Starting Backend API Server"

    # Check if backend directory exists
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found"
        return 1
    fi

    cd backend

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing backend dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install backend dependencies"
            cd ..
            return 1
        fi
    fi

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found"
        if [ -f ".env.example" ]; then
            print_info "Copying .env from example..."
            cp .env.example .env
            print_warning "Please update .env file with your database credentials"
        else
            print_error "No .env or .env.example file found"
            cd ..
            return 1
        fi
    fi

    # Kill any existing process on port 3001
    if check_port 3001; then
        print_info "Port 3001 is in use, killing existing process..."
        kill_port 3001
        sleep 2
    fi

    # Start backend server
    print_info "Starting backend server..."
    npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!

    cd ..

    # Wait for backend to start
    if wait_for_service 3001 "Backend API"; then
        print_status "Backend server started successfully (PID: $BACKEND_PID)"
        echo $BACKEND_PID > backend.pid
        return 0
    else
        print_error "Backend server failed to start"
        print_info "Check backend.log for details"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    print_header "Starting Frontend Web Server"

    # Check if frontend directory exists
    if [ ! -d "frontend/static-site" ]; then
        print_error "Frontend directory not found"
        return 1
    fi

    cd "frontend/static-site"

    # Kill any existing process on port 8080
    if check_port 8080; then
        print_info "Port 8080 is in use, killing existing process..."
        kill_port 8080
        sleep 2
    fi

    # Start frontend server
    print_info "Starting frontend server..."

    # Try different methods to start HTTP server
    if command_exists python3; then
        python3 -m http.server 8080 > ../../frontend.log 2>&1 &
        FRONTEND_PID=$!
    elif command_exists python; then
        python -m http.server 8080 > ../../frontend.log 2>&1 &
        FRONTEND_PID=$!
    elif command_exists node && command_exists npx; then
        npx serve -p 8080 > ../../frontend.log 2>&1 &
        FRONTEND_PID=$!
    elif command_exists php; then
        php -S localhost:8080 > ../../frontend.log 2>&1 &
        FRONTEND_PID=$!
    else
        print_error "No suitable HTTP server found (python3, node, or php required)"
        cd ../..
        return 1
    fi

    cd ../..

    # Wait for frontend to start
    if wait_for_service 8080 "Frontend Web Server"; then
        print_status "Frontend server started successfully (PID: $FRONTEND_PID)"
        echo $FRONTEND_PID > frontend.pid
        return 0
    else
        print_error "Frontend server failed to start"
        print_info "Check frontend.log for details"
        return 1
    fi
}

# Function to test API connectivity
test_api() {
    print_header "Testing API Connectivity"

    print_info "Testing backend health endpoint..."

    local max_attempts=10
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:3001/health >/dev/null 2>&1; then
            print_status "Backend API is responding"

            # Get and display health status
            local health_response=$(curl -s http://localhost:3001/health 2>/dev/null)
            if echo "$health_response" | grep -q '"success":true'; then
                print_status "Database connection is healthy"
                return 0
            else
                print_warning "Backend is running but database connection may be unhealthy"
                print_info "Health response: $health_response"
                return 1
            fi
        fi

        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "Backend API is not responding after $max_attempts attempts"
    return 1
}

# Function to display system status
show_status() {
    print_header "System Status"

    echo
    echo "🌐 Access Points:"
    echo "=================="
    echo "Frontend:     http://localhost:8080"
    echo "Backend API:  http://localhost:3001"
    echo "Health Check: http://localhost:3001/health"
    echo "API Docs:     http://localhost:3001/api/v1/docs"
    echo

    echo "🔗 Quick Links:"
    echo "==============="
    echo "Login:           http://localhost:8080/login.html"
    echo "Sign Up:         http://localhost:8080/signup.html"
    echo "Patient Portal:  http://localhost:8080/patient-dashboard.html"
    echo "Doctor Portal:   http://localhost:8080/doctor-dashboard.html"
    echo

    echo "📊 Database:"
    echo "============"
    echo "Host: localhost:5432"
    echo "Database: meduco"
    echo "User: postgres"
    echo

    echo "📁 Log Files:"
    echo "============="
    echo "Backend:  backend.log"
    echo "Frontend: frontend.log"
    echo

    echo "🔧 Process Management:"
    echo "======================"
    echo "Stop all services: ./stop-system.sh"
    echo "View logs: tail -f backend.log"
    echo "           tail -f frontend.log"
}

# Function to create stop script
create_stop_script() {
    cat > stop-system.sh << 'EOF'
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
EOF

    chmod +x stop-system.sh
}

# Main execution
main() {
    print_header "MEDUCO Healthcare Platform - System Startup"
    echo

    # Create stop script
    create_stop_script

    # Step 1: Start PostgreSQL
    if ! start_postgresql; then
        print_error "PostgreSQL startup failed"
        exit 1
    fi

    # Step 2: Check/Create database
    if ! check_database; then
        if ! create_database; then
            print_error "Database creation failed"
            exit 1
        fi
    fi

    # Step 3: Start Backend
    if ! start_backend; then
        print_error "Backend startup failed"
        exit 1
    fi

    # Step 4: Start Frontend
    if ! start_frontend; then
        print_error "Frontend startup failed"
        exit 1
    fi

    # Step 5: Test API
    if ! test_api; then
        print_warning "API test failed, but services are running"
    fi

    # Step 6: Show status
    show_status

    print_header "🎉 MEDUCO Healthcare Platform Started Successfully!"

    print_info "Press Ctrl+C to stop monitoring, or run ./stop-system.sh to stop all services"

    # Monitor logs
    echo
    print_info "Monitoring logs (Ctrl+C to exit):"
    tail -f backend.log frontend.log 2>/dev/null &
    TAIL_PID=$!

    # Handle cleanup on exit
    trap 'kill $TAIL_PID 2>/dev/null; exit' INT TERM

    # Keep script running
    wait $TAIL_PID
}

# Check if running from correct directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory"
    print_info "Expected structure:"
    print_info "  - backend/"
    print_info "  - frontend/"
    print_info "  - package.json"
    exit 1
fi

# Run main function
main "$@"
