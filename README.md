# MEDUCO Healthcare Management Platform

A comprehensive healthcare management system with a static frontend and Node.js/Express backend with SQLite database.

## 🏥 Features

- **User Authentication**: Separate login/signup for patients and doctors
- **Patient Dashboard**: Health records, appointments, medications, care plans
- **Doctor Dashboard**: Patient management, appointment scheduling, analytics
- **Real-time Data**: All data is stored and retrieved from SQLite database
- **Secure API**: JWT-based authentication with role-based access control
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the database**:
   ```bash
   npm run setup-db
   npm run seed-db
   ```

4. **Start the backend server**:
   ```bash
   npm run dev
   ```
   
   The backend will be running on `http://localhost:3001`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend/static-site
   ```

2. **Serve the static files** (you can use any static file server):
   ```bash
   # Using Python 3
   python -m http.server 8080
   
   # Using Node.js http-server (install with: npm install -g http-server)
   http-server -p 8080
   
   # Using PHP
   php -S localhost:8080
   ```

3. **Access the application**:
   Open `http://localhost:8080` in your browser

## 👥 Sample Credentials

### Patients
- **Email**: `jane.cooper@email.com` | **Password**: `patient123`
- **Email**: `john.doe@email.com` | **Password**: `patient123`
- **Email**: `mary.johnson@email.com` | **Password**: `patient123`

### Doctors
- **Email**: `dr.smith@meduco.com` | **Password**: `doctor123`
- **Email**: `dr.lee@meduco.com` | **Password**: `doctor123`
- **Email**: `dr.johnson@meduco.com` | **Password**: `doctor123`

### Admin
- **Email**: `admin@meduco.com` | **Password**: `admin123`

## 📁 Project Structure

```
/workspace/
├── backend/                 # Node.js/Express backend
│   ├── config/             # Database configuration
│   ├── controllers/        # API controllers (placeholder)
│   ├── database/           # Database files and scripts
│   │   ├── meduco.db      # SQLite database
│   │   ├── setup.js       # Database schema creation
│   │   └── seed.js        # Sample data insertion
│   ├── middleware/         # Authentication and validation
│   ├── models/            # Database models (placeholder)
│   ├── routes/            # API route handlers
│   ├── utils/             # Utility functions (placeholder)
│   ├── .env               # Environment configuration
│   ├── package.json       # Node.js dependencies
│   └── server.js          # Main server file
├── frontend/
│   └── static-site/       # Static HTML/CSS/JS frontend
│       ├── api.js         # API integration layer
│       ├── script.js      # Frontend JavaScript
│       ├── styles.css     # Responsive CSS styles
│       ├── index.html     # Landing page
│       ├── login.html     # Login page
│       ├── signup.html    # Registration page
│       ├── patient-dashboard.html
│       ├── doctor-dashboard.html
│       └── [other pages]  # Additional functionality pages
└── README.md              # This file
```

## 🛠 Backend API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user info

### Patients
- `GET /api/v1/patients/dashboard` - Get patient dashboard data
- `GET /api/v1/patients/profile` - Get patient profile
- `PUT /api/v1/patients/profile` - Update patient profile

### Doctors
- `GET /api/v1/doctors/dashboard` - Get doctor dashboard data
- `GET /api/v1/doctors/profile` - Get doctor profile
- `GET /api/v1/doctors/patients` - Get doctor's patients

### Appointments
- `GET /api/v1/appointments` - Get appointments
- `POST /api/v1/appointments` - Create appointment
- `PUT /api/v1/appointments/:id` - Update appointment

### Health Records
- `GET /api/v1/health-records` - Get health records
- `POST /api/v1/health-records` - Create health record
- `PUT /api/v1/health-records/:id` - Update health record

### Messages
- `GET /api/v1/messages` - Get messages
- `POST /api/v1/messages` - Send message
- `PUT /api/v1/messages/:id/read` - Mark message as read

## 🗄️ Database Schema

The SQLite database includes the following main tables:

- **users** - User authentication and roles
- **patients** - Patient profiles and information
- **doctors** - Doctor profiles and specializations
- **appointments** - Appointment scheduling and management
- **health_records** - Patient health data (blood sugar, BP, etc.)
- **messages** - Secure communication between patients and doctors
- **care_plans** - Treatment plans and progress tracking
- **medications** - Prescribed medications and adherence
- **notifications** - System notifications and alerts

## 🔧 Development

### Backend Development

```bash
cd backend
npm run dev  # Start with nodemon for auto-restart
```

### Database Management

```bash
# Recreate database schema
npm run setup-db

# Reseed with sample data
npm run seed-db
```

### API Testing

The backend includes a health check endpoint:
```bash
curl http://localhost:3001/health
```

API documentation is available at:
```
http://localhost:3001/api/v1/docs
```

## 🌟 Key Features Implemented

### Real-time Data Integration
- ✅ User authentication with JWT tokens
- ✅ Patient dashboard with real health data
- ✅ Doctor dashboard with patient information
- ✅ Dynamic data loading from SQLite database
- ✅ Secure API endpoints with role-based access

### Frontend Integration
- ✅ API integration layer (`api.js`)
- ✅ Real-time login/signup with backend
- ✅ Dashboard data loading from database
- ✅ Error handling and user feedback
- ✅ Authentication state management

### Database Features
- ✅ Comprehensive healthcare data model
- ✅ Sample data with realistic medical records
- ✅ Proper relationships and constraints
- ✅ Audit logging for security

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS configuration
- SQL injection prevention

## 📱 Responsive Design

The frontend is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Various screen sizes and orientations

## 🚀 Deployment Ready

The system is production-ready with:
- Environment configuration
- Error handling
- Logging
- Security middleware
- Database transactions
- API documentation

## 🤝 Contributing

This is a complete healthcare management system demonstrating:
- Modern web development practices
- Secure API development
- Responsive frontend design
- Database design and management
- Real-time data integration

## 📄 License

This project is for educational and demonstration purposes.