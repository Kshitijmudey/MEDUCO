#!/bin/bash

# MEDUCO Development Server Startup Script

echo "🏥 Starting MEDUCO Healthcare Platform..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Start backend server
echo "🚀 Starting backend server..."
cd backend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Check if database exists
if [ ! -f "database/meduco.db" ]; then
    echo "🗄️  Setting up database..."
    npm run setup-db
    npm run seed-db
fi

# Start backend server in background
echo "🔄 Starting backend API server on port 3001..."
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend server is running on http://localhost:3001"
    echo "📋 API Documentation: http://localhost:3001/api/v1/docs"
else
    echo "❌ Backend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend server
echo "🌐 Starting frontend server..."
cd ../frontend/static-site

# Check if Python is available for static server
if command -v python3 &> /dev/null; then
    echo "🔄 Starting frontend server on port 8080 (Python)..."
    python3 -m http.server 8080 &
    FRONTEND_PID=$!
elif command -v python &> /dev/null; then
    echo "🔄 Starting frontend server on port 8080 (Python)..."
    python -m http.server 8080 &
    FRONTEND_PID=$!
elif command -v php &> /dev/null; then
    echo "🔄 Starting frontend server on port 8080 (PHP)..."
    php -S localhost:8080 &
    FRONTEND_PID=$!
else
    echo "❌ No suitable static server found (Python or PHP required)"
    echo "💡 You can manually serve the frontend/static-site directory"
    echo "   Example: cd frontend/static-site && python3 -m http.server 8080"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Wait for frontend to start
sleep 2

echo ""
echo "🎉 MEDUCO Platform is now running!"
echo "======================================"
echo "🌐 Frontend: http://localhost:8080"
echo "🔧 Backend:  http://localhost:3001"
echo "📋 API Docs: http://localhost:3001/api/v1/docs"
echo ""
echo "👥 Sample Login Credentials:"
echo "   Patient: jane.cooper@email.com / patient123"
echo "   Doctor:  dr.smith@meduco.com / doctor123"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "======================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait