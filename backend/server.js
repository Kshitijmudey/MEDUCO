require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database connection
const database = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const healthRecordRoutes = require('./routes/healthRecords');
const messageRoutes = require('./routes/messages');
const carePlanRoutes = require('./routes/carePlans');
const medicationRoutes = require('./routes/medications');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Serve static files (for uploaded documents)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'MEDUCO API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/patients`, patientRoutes);
app.use(`${apiPrefix}/doctors`, doctorRoutes);
app.use(`${apiPrefix}/appointments`, appointmentRoutes);
app.use(`${apiPrefix}/health-records`, healthRecordRoutes);
app.use(`${apiPrefix}/messages`, messageRoutes);
app.use(`${apiPrefix}/care-plans`, carePlanRoutes);
app.use(`${apiPrefix}/medications`, medicationRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);

// API documentation endpoint
app.get(`${apiPrefix}/docs`, (req, res) => {
    res.json({
        success: true,
        message: 'MEDUCO API Documentation',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /auth/register': 'Register a new user (patient or doctor)',
                'POST /auth/login': 'Login user',
                'POST /auth/logout': 'Logout user',
                'POST /auth/refresh': 'Refresh access token',
                'POST /auth/forgot-password': 'Request password reset',
                'POST /auth/reset-password': 'Reset password with token'
            },
            patients: {
                'GET /patients/profile': 'Get patient profile',
                'PUT /patients/profile': 'Update patient profile',
                'GET /patients/dashboard': 'Get patient dashboard data'
            },
            doctors: {
                'GET /doctors/profile': 'Get doctor profile',
                'PUT /doctors/profile': 'Update doctor profile',
                'GET /doctors/dashboard': 'Get doctor dashboard data',
                'GET /doctors/patients': 'Get doctor\'s patients list',
                'GET /doctors/availability': 'Get doctor availability'
            },
            appointments: {
                'GET /appointments': 'Get appointments',
                'POST /appointments': 'Create new appointment',
                'PUT /appointments/:id': 'Update appointment',
                'DELETE /appointments/:id': 'Cancel appointment'
            },
            healthRecords: {
                'GET /health-records': 'Get health records',
                'POST /health-records': 'Create health record',
                'PUT /health-records/:id': 'Update health record',
                'DELETE /health-records/:id': 'Delete health record'
            },
            messages: {
                'GET /messages': 'Get messages',
                'POST /messages': 'Send new message',
                'PUT /messages/:id/read': 'Mark message as read'
            },
            carePlans: {
                'GET /care-plans': 'Get care plans',
                'POST /care-plans': 'Create care plan',
                'PUT /care-plans/:id': 'Update care plan',
                'GET /care-plans/:id/tasks': 'Get care plan tasks'
            },
            medications: {
                'GET /medications': 'Get medications',
                'POST /medications': 'Add medication',
                'PUT /medications/:id': 'Update medication',
                'POST /medications/:id/log': 'Log medication taken'
            },
            notifications: {
                'GET /notifications': 'Get notifications',
                'PUT /notifications/:id/read': 'Mark notification as read'
            }
        }
    });
});

// 404 handler for API routes
app.use('/api/v1', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Global error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);

    // Handle specific error types
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File too large'
        });
    }

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON in request body'
        });
    }

    // Default error response
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await database.connect();
        
        // Create uploads directory if it doesn't exist
        const fs = require('fs');
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        app.listen(PORT, () => {
            console.log(`🚀 MEDUCO API Server running on port ${PORT}`);
            console.log(`🏥 Environment: ${process.env.NODE_ENV}`);
            console.log(`📋 API Documentation: http://localhost:${PORT}${apiPrefix}/docs`);
            console.log(`💊 Health Check: http://localhost:${PORT}/health`);
            console.log(`📊 Database: SQLite (${database.dbPath})`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    database.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    database.close();
    process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    database.close();
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    database.close();
    process.exit(1);
});

startServer();