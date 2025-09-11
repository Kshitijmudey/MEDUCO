#!/bin/bash

# MEDUCO System Status Check

echo "🏥 MEDUCO Healthcare Platform Status"
echo "===================================="

# Check backend server
echo -n "🔧 Backend Server (port 3001): "
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Running"
    echo "   📋 API Docs: http://localhost:3001/api/v1/docs"
else
    echo "❌ Not running"
fi

# Check frontend server
echo -n "🌐 Frontend Server (port 8080): "
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Running"
    echo "   🏠 Website: http://localhost:8080"
else
    echo "❌ Not running"
fi

# Check database
echo -n "🗄️  Database: "
if [ -f "backend/database/meduco.db" ]; then
    echo "✅ Available"
    # Count records
    cd backend
    USERS=$(sqlite3 database/meduco.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    PATIENTS=$(sqlite3 database/meduco.db "SELECT COUNT(*) FROM patients;" 2>/dev/null || echo "0")
    DOCTORS=$(sqlite3 database/meduco.db "SELECT COUNT(*) FROM doctors;" 2>/dev/null || echo "0")
    echo "   👥 Users: $USERS | 🏥 Patients: $PATIENTS | 👨‍⚕️ Doctors: $DOCTORS"
    cd ..
else
    echo "❌ Not found"
fi

echo ""
echo "📊 Quick Stats:"
echo "=============="

# Show running processes
echo "🔄 Running Processes:"
ps aux | grep -E "(node|python.*http|php.*-S)" | grep -v grep | while read line; do
    echo "   $line"
done

echo ""
echo "🌐 Network Status:"
netstat -tlnp 2>/dev/null | grep -E ":3001|:8080" | while read line; do
    echo "   $line"
done

echo ""
echo "💡 Quick Commands:"
echo "   Start System: ./start-dev.sh"
echo "   Check Health: curl http://localhost:3001/health"
echo "   View Logs: tail -f backend/logs/* (if logging enabled)"