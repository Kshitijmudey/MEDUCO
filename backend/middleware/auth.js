const jwt = require('jsonwebtoken');
const database = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database to ensure they still exist and are active
        const user = await database.get(
            'SELECT id, email, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        } else {
            console.error('Auth middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authentication error'
            });
        }
    }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Middleware to check if user is a patient
const requirePatient = requireRole('patient');

// Middleware to check if user is a doctor
const requireDoctor = requireRole('doctor');

// Middleware to check if user is an admin
const requireAdmin = requireRole('admin');

// Middleware to check if user is either doctor or admin
const requireDoctorOrAdmin = requireRole(['doctor', 'admin']);

// Middleware to get patient info for authenticated patient
const getPatientInfo = async (req, res, next) => {
    if (req.user.role !== 'patient') {
        return next();
    }

    try {
        const patient = await database.get(
            'SELECT * FROM patients WHERE user_id = ?',
            [req.user.id]
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient profile not found'
            });
        }

        req.patient = patient;
        next();
    } catch (error) {
        console.error('Get patient info error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patient information'
        });
    }
};

// Middleware to get doctor info for authenticated doctor
const getDoctorInfo = async (req, res, next) => {
    if (req.user.role !== 'doctor') {
        return next();
    }

    try {
        const doctor = await database.get(
            'SELECT * FROM doctors WHERE user_id = ?',
            [req.user.id]
        );

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor profile not found'
            });
        }

        req.doctor = doctor;
        next();
    } catch (error) {
        console.error('Get doctor info error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving doctor information'
        });
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requirePatient,
    requireDoctor,
    requireAdmin,
    requireDoctorOrAdmin,
    getPatientInfo,
    getDoctorInfo
};