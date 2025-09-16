# Database Setup Guide - MEDUCO Healthcare Platform

This guide will help you properly connect PostgreSQL database with the MEDUCO backend.

## Prerequisites

Before starting, ensure you have:
- Node.js (v14 or higher)
- npm or yarn
- Git

## Step 1: Install PostgreSQL

### On macOS (using Homebrew)
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql
brew services start postgresql
```

### On Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### On Windows
1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the postgres user

## Step 2: Create Database and User

### Method 1: Using Command Line
```bash
# Connect to PostgreSQL (you may need to switch to postgres user on Linux)
psql postgres

# Create database
CREATE DATABASE meduco;

# Create user (optional, or use default postgres user)
CREATE USER meduco_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE meduco TO meduco_user;

# Exit psql
\q
```

### Method 2: Using pgAdmin
1. Install pgAdmin from https://www.pgadmin.org/
2. Connect to your PostgreSQL server
3. Right-click "Databases" → Create → Database
4. Name it "meduco"

## Step 3: Configure Environment Variables

The backend already has a `.env` file, but you need to update the database connection settings:

```bash
cd backend
```

Edit the `.env` file and ensure these database settings are correct:

```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=meduco
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password

# Other required settings
NODE_ENV=development
PORT=3001
JWT_SECRET=your_very_secure_jwt_secret_here_minimum_32_characters
API_PREFIX=/api/v1

# Optional: Email configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Optional: Twilio (for SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Optional: OpenAI (for AI features)
OPENAI_API_KEY=your_openai_key
```

**Important**: Replace the following with your actual values:
- `your_postgres_password` - Your PostgreSQL password
- `your_very_secure_jwt_secret_here_minimum_32_characters` - A strong random string for JWT tokens

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

## Step 5: Set up Database Schema

Run the database setup script to create all necessary tables:

```bash
npm run setup-db
```

This will create all the required tables:
- users, patients, doctors
- appointments, health_records
- messages, care_plans, medications
- notifications, audit_logs
- and more...

## Step 6: Initialize Database (Optional)

If you want to start with a clean database:

```bash
npm run init-db
```

This will clear all data and reset sequences.

## Step 7: Test the Connection

### Start the Backend Server
```bash
npm run dev
```

You should see output like:
```
🚀 MEDUCO API Server running on port 3001
🏥 Environment: development
📋 API Documentation: http://localhost:3001/api/v1/docs
💊 Health Check: http://localhost:3001/health
📊 Database: PostgreSQL (localhost:5432/meduco)
```

### Test Database Health
Open your browser or use curl to test:

```bash
curl http://localhost:3001/health
```

You should get a response like:
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

## Step 8: API Endpoints

Once the backend is running, you can access:

- **API Documentation**: http://localhost:3001/api/v1/docs
- **Health Check**: http://localhost:3001/health
- **Authentication**: http://localhost:3001/api/v1/auth/*
- **Patient Routes**: http://localhost:3001/api/v1/patients/*
- **Doctor Routes**: http://localhost:3001/api/v1/doctors/*
- **Appointments**: http://localhost:3001/api/v1/appointments/*

## Database Schema Overview

The database contains the following main tables:

### Core Tables
- **users**: Base authentication table
- **patients**: Patient profiles and information
- **doctors**: Doctor profiles and information

### Healthcare Tables
- **appointments**: Medical appointments between patients and doctors
- **health_records**: Patient health data (blood pressure, glucose, etc.)
- **medications**: Prescribed medications
- **care_plans**: Treatment plans created by doctors

### Communication Tables
- **messages**: Internal messaging system
- **notifications**: System notifications

### System Tables
- **audit_logs**: Track all important actions
- **password_reset_tokens**: Handle password reset functionality

## Troubleshooting

### Connection Issues

1. **"Connection refused"**:
   - Make sure PostgreSQL is running: `brew services restart postgresql` (macOS)
   - Check if PostgreSQL is listening on port 5432: `lsof -i :5432`

2. **"Authentication failed"**:
   - Verify your username and password in `.env`
   - Try connecting manually: `psql -h localhost -U postgres -d meduco`

3. **"Database does not exist"**:
   - Create the database: `createdb meduco`
   - Or run: `psql postgres -c "CREATE DATABASE meduco;"`

### Permission Issues

If you get permission errors:
```bash
# On macOS/Linux, you might need to set postgres user password
sudo -u postgres psql postgres
\password postgres
```

### Port Conflicts

If port 3001 is already in use:
- Change `PORT=3001` to another port in `.env`
- Or stop the process using port 3001

## Migration from SQLite

If you previously used SQLite and have data to migrate:

```bash
npm run migrate-to-postgres
```

This will transfer your data from SQLite to PostgreSQL.

## Production Deployment

For production deployment:

1. Use environment variables instead of `.env` file
2. Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
3. Set `NODE_ENV=production`
4. Use strong, unique passwords
5. Enable SSL connections
6. Set up regular backups

## Database Backup

### Create Backup
```bash
pg_dump -h localhost -U postgres meduco > meduco_backup.sql
```

### Restore Backup
```bash
psql -h localhost -U postgres meduco < meduco_backup.sql
```

## Next Steps

1. Start the frontend application
2. Register new users through the web interface
3. Test the complete patient care workflow
4. Set up monitoring and logging for production

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL is running and accessible
4. Test database connection manually with psql

The backend is now properly connected to PostgreSQL and ready for development or production use!