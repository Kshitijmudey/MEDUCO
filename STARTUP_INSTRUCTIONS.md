# MEDUCO Healthcare Platform - Quick Startup Instructions

## 🚀 Quick Start (5 Minutes)

Follow these steps to get your MEDUCO Healthcare Platform running with PostgreSQL and real-time features.

## Step 1: Install PostgreSQL

### macOS (Homebrew)
```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Test installation
psql --version
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer, remember the password!
3. Add PostgreSQL to PATH

## Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In PostgreSQL prompt:
CREATE DATABASE meduco;
\q
```

## Step 3: Configure Backend

```bash
# Navigate to backend
cd "ai based patient care management system/backend"

# Install dependencies
npm install

# Update .env file (create if doesn't exist)
nano .env
```

Add this to `.env`:
```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=meduco
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here

# JWT (IMPORTANT: Use a strong 32+ character secret)
JWT_SECRET=super_secure_jwt_secret_at_least_32_characters_long

# Server
NODE_ENV=development
PORT=3001
```

## Step 4: Setup Database Schema

```bash
# Create all tables
npm run setup-db

# Initialize with empty data
npm run init-db
```

## Step 5: Start Services

### Terminal 1: Start Backend
```bash
cd "ai based patient care management system/backend"
npm run dev
```

You should see:
```
🚀 MEDUCO API Server running on port 3001
📊 Database: PostgreSQL (localhost:5432/meduco)
```

### Terminal 2: Start Frontend
```bash
cd "ai based patient care management system/frontend/static-site"
python3 -m http.server 8080
```

## Step 6: Access the System

- **Frontend**: http://localhost:8080
- **API Health**: http://localhost:3001/health
- **Sign Up**: http://localhost:8080/signup.html
- **Login**: http://localhost:8080/login.html

## Step 7: Install pgAdmin (Optional)

### Desktop Version
Download from: https://www.pgadmin.org/download/

### Docker Version
```bash
docker run -p 5050:80 \
  -e 'PGADMIN_DEFAULT_EMAIL=admin@meduco.com' \
  -e 'PGADMIN_DEFAULT_PASSWORD=admin123' \
  -d dpage/pgadmin4
```

Access at: http://localhost:5050

### Connect to Database in pgAdmin
- Host: localhost (or host.docker.internal for Docker)
- Port: 5432
- Database: meduco
- Username: postgres
- Password: your_postgres_password

## ✅ Test Real-time Features

1. **Create Test Account**:
   - Go to http://localhost:8080/signup.html
   - Register as a Patient
   - Login with your credentials

2. **Test Dashboard**:
   - Visit http://localhost:8080/patient-dashboard.html
   - Open browser developer tools (F12)
   - Look for real-time connection messages

3. **Watch Database in Real-time**:
   - Open pgAdmin
   - Navigate to meduco database
   - Use Query Tool to run: `SELECT * FROM users ORDER BY created_at DESC;`
   - Create new accounts and see them appear instantly

4. **Test API**:
   ```bash
   # Health check
   curl http://localhost:3001/health
   
   # Should return:
   # {"success":true,"message":"MEDUCO API is running","database":{"status":"healthy"}}
   ```

## 🔧 Troubleshooting

### PostgreSQL Not Running
```bash
# macOS
brew services restart postgresql@14

# Linux
sudo systemctl restart postgresql

# Windows
# Restart PostgreSQL service in Services panel
```

### Backend Won't Start
```bash
# Check if port 3001 is free
lsof -i :3001

# Kill process if needed
kill -9 $(lsof -ti:3001)

# Check .env file exists and has correct values
cat backend/.env
```

### Frontend Won't Load
```bash
# Try different Python command
python -m http.server 8080

# Or use Node.js
npx serve -p 8080

# Or PHP
php -S localhost:8080
```

### Database Connection Failed
1. Verify PostgreSQL is running: `ps aux | grep postgres`
2. Test connection: `psql -U postgres -d meduco`
3. Check .env file has correct credentials
4. Ensure database exists: `psql -U postgres -l | grep meduco`

### Real-time Not Working
1. Check browser console for errors
2. Verify backend logs for EventSource errors
3. Test endpoint: http://localhost:3001/api/v1/realtime/events
4. Clear browser cache and reload

## 🎯 What You Get

### ✅ Complete Healthcare Platform
- Patient registration and authentication
- Doctor dashboard with patient management
- Appointment scheduling system
- Health record tracking
- Real-time notifications
- Secure messaging between patients and doctors
- Care plan management
- Medication tracking

### ✅ Real-time Features
- Live dashboard updates
- Instant notifications
- Real-time data synchronization
- Offline support with sync
- Browser notifications
- Live connection status

### ✅ Database Features
- PostgreSQL with full ACID compliance
- Real-time monitoring with pgAdmin
- Automatic schema setup
- Data migration support
- Connection pooling
- Performance optimization

## 📊 Monitoring Real-time Data

### pgAdmin Queries
```sql
-- View all patients
SELECT p.*, u.email FROM patients p JOIN users u ON p.user_id = u.id;

-- Monitor health records in real-time
SELECT * FROM health_records ORDER BY recorded_at DESC LIMIT 10;

-- Check recent appointments
SELECT a.*, p.first_name, p.last_name, d.first_name as doc_first, d.last_name as doc_last 
FROM appointments a 
JOIN patients p ON a.patient_id = p.id 
JOIN doctors d ON a.doctor_id = d.id 
ORDER BY a.created_at DESC;

-- Real-time activity monitoring
SELECT * FROM pg_stat_activity WHERE datname = 'meduco';
```

### Browser Console Commands
```javascript
// Check real-time connection
console.log('Connected:', window.meducoAPI.isRealTimeConnected());

// Trigger test notification
window.meducoAPI.showNotification({
  title: 'Test Notification',
  message: 'Real-time system is working!',
  type: 'info'
});

// View cached data
console.log('Cache:', window.meducoAPI.dataCache);
```

## 🎉 Success!

Your MEDUCO Healthcare Platform is now running with:
- ✅ PostgreSQL database with real-time monitoring
- ✅ Node.js backend with full REST API
- ✅ Enhanced frontend with real-time features
- ✅ Live notifications and updates
- ✅ Complete patient care workflow

## 📞 Need Help?

1. **Check Logs**:
   - Backend: Check terminal output or `backend.log`
   - Frontend: Check browser developer tools console
   - Database: Check PostgreSQL logs

2. **Common Issues**:
   - Port conflicts: Use different ports in configuration
   - Permission issues: Run with appropriate user permissions
   - Network issues: Check firewall settings

3. **Reset Everything**:
   ```bash
   # Stop all services
   killall node python3 postgres
   
   # Restart PostgreSQL
   brew services restart postgresql@14
   
   # Clear Node cache
   cd backend && rm -rf node_modules && npm install
   
   # Restart services
   npm run dev  # In backend terminal
   python3 -m http.server 8080  # In frontend terminal
   ```

**🏥 Your MEDUCO Healthcare Platform is ready for real-time patient care management!**

Access your platform at: http://localhost:8080