# MEDUCO Healthcare Platform - Complete Setup Guide

## 📋 Overview
This guide will help you set up the complete MEDUCO Healthcare Platform with PostgreSQL database, enhanced frontend with real-time features, and proper backend integration.

## 🔧 Prerequisites

Before starting, ensure you have:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for version control)
- **PostgreSQL** (we'll install this)
- **pgAdmin** (optional but recommended for database management)

## 🚀 Step 1: Install PostgreSQL

### On macOS (using Homebrew)
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Add PostgreSQL to PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Create your first database user (optional)
createuser --interactive --pwprompt
```

### On Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create a database user
sudo -u postgres createuser --interactive --pwprompt your_username
```

### On Windows
1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. **Remember the password you set for the postgres user!**
4. Add PostgreSQL bin directory to your PATH environment variable

### Verify PostgreSQL Installation
```bash
# Check PostgreSQL version
psql --version

# Connect to PostgreSQL (you might need to use postgres user on Linux/Mac)
psql -U postgres

# If successful, you should see:
# postgres=#
```

## 🗄️ Step 2: Create Database and User

### Method 1: Using Command Line
```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# In the PostgreSQL prompt, run these commands:
CREATE DATABASE meduco;
CREATE USER meduco_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE meduco TO meduco_user;
GRANT ALL ON SCHEMA public TO meduco_user;

# Exit PostgreSQL
\q
```

### Method 2: Using pgAdmin (Recommended)
1. **Install pgAdmin**: Download from https://www.pgadmin.org/
2. **Connect to PostgreSQL**:
   - Host: localhost
   - Port: 5432
   - Username: postgres
   - Password: (the one you set during installation)
3. **Create Database**:
   - Right-click "Databases" → Create → Database
   - Name: `meduco`
4. **Create User** (optional):
   - Right-click "Login/Group Roles" → Create → Login/Group Role
   - Name: `meduco_user`
   - Set password in "Definition" tab
   - Grant privileges in "Privileges" tab

## 🔧 Step 3: Setup Backend

### Navigate to Backend Directory
```bash
cd "ai based patient care management system/backend"
```

### Install Dependencies
```bash
npm install
```

### Configure Environment Variables
Create or update the `.env` file:
```bash
# Copy from example if exists
cp .env.example .env

# Or create new .env file
nano .env
```

Add these configuration values:
```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_PREFIX=/api/v1

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=meduco
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password_here

# JWT Configuration (IMPORTANT: Use a strong secret!)
JWT_SECRET=your_very_secure_jwt_secret_minimum_32_characters_long
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Optional: Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Optional: OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
```

**⚠️ IMPORTANT**: Replace the following with your actual values:
- `your_postgres_password_here` - Your PostgreSQL password
- `your_very_secure_jwt_secret_minimum_32_characters_long` - A strong random string

### Setup Database Schema
```bash
# Create all database tables
npm run setup-db

# Initialize with empty tables (optional)
npm run init-db
```

### Test Backend Connection
```bash
# Start the backend server
npm run dev
```

You should see:
```
🚀 MEDUCO API Server running on port 3001
🏥 Environment: development
📋 API Documentation: http://localhost:3001/api/v1/docs
💊 Health Check: http://localhost:3001/health
📊 Database: PostgreSQL (localhost:5432/meduco)
```

### Verify Database Connection
Open a new terminal and test:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "success": true,
  "message": "MEDUCO API is running",
  "database": {
    "type": "postgresql",
    "status": "healthy",
    "connected": true
  }
}
```

## 🌐 Step 4: Setup Frontend

### Navigate to Frontend Directory
```bash
cd "../frontend/static-site"
```

### Update Frontend Files
The frontend has been enhanced with real-time capabilities. Make sure you have these files:
- `enhanced-api.js` - Enhanced API client with real-time features
- `enhanced-styles.css` - Improved CSS for notifications and real-time features
- `enhanced-dashboard.js` - Real-time dashboard functionality

### Update HTML Files
Add these imports to your HTML files (before closing `</body>` tag):

#### For all pages:
```html
<!-- Enhanced CSS -->
<link rel="stylesheet" href="enhanced-styles.css">

<!-- Enhanced API -->
<script src="enhanced-api.js"></script>
```

#### For dashboard pages:
```html
<!-- Dashboard functionality -->
<script src="enhanced-dashboard.js"></script>
```

### Start Frontend Server
```bash
# Using Python (built-in)
python3 -m http.server 8080

# Or using Node.js serve (install if needed)
npx serve -p 8080

# Or using PHP (if installed)
php -S localhost:8080
```

## 🚀 Step 5: Start Complete System

### Terminal 1: Start Backend
```bash
cd "ai based patient care management system/backend"
npm run dev
```

### Terminal 2: Start Frontend
```bash
cd "ai based patient care management system/frontend/static-site"
python3 -m http.server 8080
```

### Terminal 3: Monitor PostgreSQL (Optional)
```bash
# Watch PostgreSQL logs
tail -f /opt/homebrew/var/log/postgresql@14.log  # macOS with Homebrew
# or
sudo tail -f /var/log/postgresql/postgresql-14-main.log  # Ubuntu
```

## 🔍 Step 6: Access the System

### Frontend URLs:
- **Main Website**: http://localhost:8080
- **Patient Dashboard**: http://localhost:8080/patient-dashboard.html
- **Doctor Dashboard**: http://localhost:8080/doctor-dashboard.html
- **Login**: http://localhost:8080/login.html
- **Sign Up**: http://localhost:8080/signup.html

### Backend URLs:
- **API Health Check**: http://localhost:3001/health
- **API Documentation**: http://localhost:3001/api/v1/docs
- **Real-time Events**: http://localhost:3001/api/v1/realtime/events (requires auth)

### Database Access:
- **pgAdmin**: http://localhost:5050 (if installed via Docker)
- **Direct Connection**: 
  - Host: localhost
  - Port: 5432
  - Database: meduco
  - Username: postgres

## 📊 Step 7: Connect pgAdmin for Real-time Database Monitoring

### Install pgAdmin
- **Desktop Version**: Download from https://www.pgadmin.org/download/
- **Web Version**: 
  ```bash
  docker run -p 5050:80 \
    -e 'PGADMIN_DEFAULT_EMAIL=admin@example.com' \
    -e 'PGADMIN_DEFAULT_PASSWORD=admin' \
    -d dpage/pgadmin4
  ```

### Connect to Database
1. Open pgAdmin (http://localhost:5050 if using Docker)
2. Add New Server:
   - **Name**: MEDUCO Local
   - **Host**: host.docker.internal (Docker) or localhost
   - **Port**: 5432
   - **Database**: meduco
   - **Username**: postgres
   - **Password**: your_postgres_password

### Monitor Real-time Data
1. **View Tables**: Expand Databases → meduco → Schemas → public → Tables
2. **Run Queries**: Tools → Query Tool
3. **Monitor Activity**: Dashboard tab shows real-time activity
4. **Auto-refresh**: Enable auto-refresh for real-time monitoring

### Useful Monitoring Queries
```sql
-- View recent health records
SELECT * FROM health_records ORDER BY recorded_at DESC LIMIT 10;

-- Monitor active connections
SELECT * FROM pg_stat_activity WHERE datname = 'meduco';

-- Check recent appointments
SELECT a.*, p.first_name, p.last_name 
FROM appointments a 
JOIN patients p ON a.patient_id = p.id 
ORDER BY a.created_at DESC LIMIT 10;

-- Monitor real-time updates
SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size
FROM (
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
) t;
```

## ✅ Step 8: Test Real-time Features

### 1. Test User Registration
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123",
    "role": "patient",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

### 2. Test Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123",
    "role": "patient"
  }'
```

### 3. Test Real-time Dashboard
1. Open patient dashboard: http://localhost:8080/patient-dashboard.html
2. Login with the test account
3. Open browser developer tools (F12) → Console
4. You should see real-time connection messages:
   ```
   🔄 Establishing real-time connection...
   ✅ Real-time connection established
   🚀 Initializing enhanced dashboard for: patient
   ```

### 4. Test Database Updates
Add some test health data and watch it appear in real-time:
```bash
# Add a health record (replace TOKEN with your auth token)
curl -X POST http://localhost:3001/api/v1/health-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "recordType": "blood_sugar",
    "value": "120",
    "unit": "mg/dL",
    "recordedAt": "2024-01-15T10:30:00Z",
    "notes": "After breakfast"
  }'
```

## 🔧 Troubleshooting

### PostgreSQL Issues

#### Connection Refused
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL if stopped
brew services start postgresql@14     # macOS
sudo systemctl start postgresql       # Linux
```

#### Authentication Failed
```bash
# Reset postgres user password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'newpassword';"

# Or create new user
sudo -u postgres createuser --interactive --pwprompt
```

#### Database doesn't exist
```bash
createdb meduco -U postgres
```

### Backend Issues

#### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process if needed
kill -9 PID_NUMBER

# Or use different port in .env
PORT=3002
```

#### Missing Dependencies
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### Environment Variables
```bash
# Check if .env file exists and has correct values
cat backend/.env

# Verify JWT secret is set and long enough (minimum 32 characters)
```

### Frontend Issues

#### API Connection Errors
1. Verify backend is running on port 3001
2. Check browser console for CORS errors
3. Ensure `enhanced-api.js` has correct baseURL

#### Real-time Not Working
1. Check browser console for EventSource errors
2. Verify WebSocket/SSE support in browser
3. Check if real-time endpoint is accessible: http://localhost:3001/api/v1/realtime/events

#### Styles Not Loading
1. Verify `enhanced-styles.css` is in the same directory
2. Check file paths in HTML imports
3. Clear browser cache (Ctrl+F5)

### Database Performance

#### Slow Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();

-- View slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

#### Connection Limits
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Increase max connections if needed
ALTER SYSTEM SET max_connections = 200;
```

## 📈 Performance Optimization

### Database Optimization
```sql
-- Create additional indexes for better performance
CREATE INDEX idx_health_records_patient_date ON health_records(patient_id, recorded_at);
CREATE INDEX idx_appointments_date_doctor ON appointments(appointment_date, doctor_id);
CREATE INDEX idx_messages_recipient_read ON messages(recipient_id, is_read);

-- Update table statistics
ANALYZE;
```

### Frontend Optimization
1. **Enable Compression**: Use gzip compression for static files
2. **Browser Caching**: Set appropriate cache headers
3. **CDN**: Use CDN for static assets in production
4. **Minification**: Minify CSS and JavaScript files

### Backend Optimization
1. **Connection Pooling**: Already configured (max 20 connections)
2. **Caching**: Redis for session storage and caching
3. **Load Balancing**: Multiple backend instances with nginx
4. **Database Replication**: Master-slave setup for read scaling

## 🚀 Production Deployment

### Environment Setup
```env
NODE_ENV=production
POSTGRES_SSL=true
POSTGRES_HOST=your-production-db-host
JWT_SECRET=super-secure-production-secret
```

### Security Checklist
- [ ] Change all default passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Use environment variables for sensitive data
- [ ] Set up proper firewall rules
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Backup strategy in place

### Monitoring Setup
1. **Application Monitoring**: New Relic, DataDog, or Sentry
2. **Database Monitoring**: pgAdmin, DataDog, or custom dashboards
3. **Server Monitoring**: System metrics and logs
4. **Real-time Alerts**: Critical system failures

## 🎉 Success!

If you've followed this guide, you should now have:

✅ **PostgreSQL Database**: Running and connected
✅ **Backend API**: Full REST API with real-time capabilities
✅ **Frontend**: Enhanced with real-time updates
✅ **Real-time Features**: Live data updates and notifications
✅ **Database Monitoring**: pgAdmin for real-time data viewing
✅ **Complete Healthcare Platform**: Ready for development/production

### Quick Commands Reference
```bash
# Start PostgreSQL
brew services start postgresql@14  # macOS
sudo systemctl start postgresql    # Linux

# Start Backend
cd backend && npm run dev

# Start Frontend  
cd frontend/static-site && python3 -m http.server 8080

# Connect to Database
psql -U postgres -d meduco

# View Logs
tail -f backend/logs/app.log
```

### Support & Resources
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Node.js Documentation**: https://nodejs.org/docs/
- **pgAdmin Documentation**: https://www.pgadmin.org/docs/
- **Project Issues**: Check GitHub issues for known problems

---

**🎯 Your MEDUCO Healthcare Platform is now ready for real-time patient care management!**