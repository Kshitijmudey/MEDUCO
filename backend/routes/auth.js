const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const database = require('../config/database');
const { validateRegistration, validateLogin, validatePasswordReset } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Generate Patient ID
const generatePatientID = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `PAT-${currentYear}-${randomNum}`;
};

// Generate Doctor ID
const generateDoctorID = () => {
    const randomNum = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `DOC-${randomNum}`;
};

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { email, password, role, firstName, lastName, phone, specialization, department } = req.body;

        // Check if user already exists
        const existingUser = await database.get(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Start transaction
        const operations = [];

        // Create user
        operations.push(async () => {
            return database.run(
                'INSERT INTO users (email, password_hash, role, is_active, email_verified) VALUES (?, ?, ?, 1, 1)',
                [email, passwordHash, role]
            );
        });

        const results = await database.transaction(operations);
        const userId = results[0].id;

        let profileId;
        let userIdField;

        if (role === 'patient') {
            // Create patient profile
            const patientId = generatePatientID();
            const patientResult = await database.run(
                'INSERT INTO patients (user_id, patient_id, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)',
                [userId, patientId, firstName, lastName, phone || null]
            );
            profileId = patientResult.id;
            userIdField = patientId;
        } else if (role === 'doctor') {
            // Create doctor profile
            const doctorId = generateDoctorID();
            const doctorResult = await database.run(
                'INSERT INTO doctors (user_id, doctor_id, first_name, last_name, phone, specialization, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, doctorId, firstName, lastName, phone || null, specialization || null, department || null]
            );
            profileId = doctorResult.id;
            userIdField = doctorId;
        }

        // Generate token
        const token = generateToken(userId, email, role);

        // Log successful registration
        await database.run(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'REGISTER', 'users', userId, JSON.stringify({ email, role }), req.ip]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: userId,
                    email,
                    role,
                    [role === 'patient' ? 'patientId' : 'doctorId']: userIdField
                },
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Get user from database
        const user = await database.get(
            'SELECT id, email, password_hash, role, is_active FROM users WHERE email = ? AND role = ?',
            [email, role]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Get profile information
        let profile = null;
        if (role === 'patient') {
            profile = await database.get(
                'SELECT patient_id, first_name, last_name, phone FROM patients WHERE user_id = ?',
                [user.id]
            );
        } else if (role === 'doctor') {
            profile = await database.get(
                'SELECT doctor_id, first_name, last_name, phone, specialization, department FROM doctors WHERE user_id = ?',
                [user.id]
            );
        }

        // Update last login
        await database.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Generate token
        const token = generateToken(user.id, user.email, user.role);

        // Log successful login
        await database.run(
            'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [user.id, 'LOGIN', req.ip, req.get('User-Agent')]
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    profile
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Logout user (mainly for logging purposes)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Log logout action
        await database.run(
            'INSERT INTO audit_logs (user_id, action, ip_address) VALUES (?, ?, ?)',
            [req.user.id, 'LOGOUT', req.ip]
        );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        // Generate new token
        const token = generateToken(req.user.id, req.user.email, req.user.role);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: { token }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Token refresh failed'
        });
    }
});

// Forgot password
router.post('/forgot-password', validatePasswordReset, async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const user = await database.get(
            'SELECT id, email FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent'
            });
        }

        // Generate reset token
        const resetToken = uuidv4();
        const expiresAt = moment().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');

        // Save reset token
        await database.run(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, resetToken, expiresAt]
        );

        // In a real application, you would send an email here
        // For now, we'll just log it
        console.log(`Password reset token for ${email}: ${resetToken}`);

        // Log password reset request
        await database.run(
            'INSERT INTO audit_logs (user_id, action, ip_address) VALUES (?, ?, ?)',
            [user.id, 'PASSWORD_RESET_REQUEST', req.ip]
        );

        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent',
            // In development, include the token for testing
            ...(process.env.NODE_ENV === 'development' && { resetToken })
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Password reset request failed'
        });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        // Validate new password
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Find valid reset token
        const resetToken = await database.get(
            'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ? AND used = 0',
            [token]
        );

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Check if token is expired
        if (moment().isAfter(resetToken.expires_at)) {
            return res.status(400).json({
                success: false,
                message: 'Reset token has expired'
            });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await database.run(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, resetToken.user_id]
        );

        // Mark token as used
        await database.run(
            'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
            [token]
        );

        // Log password reset
        await database.run(
            'INSERT INTO audit_logs (user_id, action, ip_address) VALUES (?, ?, ?)',
            [resetToken.user_id, 'PASSWORD_RESET', req.ip]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Password reset failed'
        });
    }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        let profile = null;
        
        if (req.user.role === 'patient') {
            profile = await database.get(
                'SELECT patient_id, first_name, last_name, phone, date_of_birth, gender, address FROM patients WHERE user_id = ?',
                [req.user.id]
            );
        } else if (req.user.role === 'doctor') {
            profile = await database.get(
                'SELECT doctor_id, first_name, last_name, phone, specialization, department, years_experience FROM doctors WHERE user_id = ?',
                [req.user.id]
            );
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    role: req.user.role,
                    profile
                }
            }
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user information'
        });
    }
});

module.exports = router;