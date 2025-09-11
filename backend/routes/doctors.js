const express = require('express');
const database = require('../config/database');
const { authenticateToken, requireDoctor, getDoctorInfo } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireDoctor);
router.use(getDoctorInfo);

// Get doctor dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const doctorId = req.doctor.id;

        // Get today's appointments
        const todayAppointments = await database.all(`
            SELECT 
                a.id, a.appointment_time, a.type, a.reason, a.status,
                p.first_name, p.last_name, p.patient_id
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ? AND a.appointment_date = date('now')
            ORDER BY a.appointment_time
        `, [doctorId]);

        // Get total patients count
        const totalPatients = await database.get(`
            SELECT COUNT(DISTINCT a.patient_id) as count
            FROM appointments a
            WHERE a.doctor_id = ?
        `, [doctorId]);

        // Get pending appointments count
        const pendingAppointments = await database.get(`
            SELECT COUNT(*) as count
            FROM appointments
            WHERE doctor_id = ? AND status = 'pending'
        `, [doctorId]);

        // Get recent messages
        const recentMessages = await database.all(`
            SELECT 
                m.id, m.subject, m.message, m.is_urgent, m.is_read, m.created_at,
                u.email, p.first_name, p.last_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN patients p ON u.id = p.user_id
            WHERE m.recipient_id = ? AND m.recipient_type = 'doctor'
            ORDER BY m.created_at DESC
            LIMIT 5
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                doctor: req.doctor,
                todayAppointments,
                totalPatients: totalPatients.count,
                pendingAppointments: pendingAppointments.count,
                recentMessages
            }
        });

    } catch (error) {
        console.error('Doctor dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data'
        });
    }
});

// Get doctor profile
router.get('/profile', async (req, res) => {
    try {
        res.json({
            success: true,
            data: { doctor: req.doctor }
        });
    } catch (error) {
        console.error('Get doctor profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get doctor profile'
        });
    }
});

// Get doctor's patients
router.get('/patients', async (req, res) => {
    try {
        const patients = await database.all(`
            SELECT DISTINCT
                p.id, p.patient_id, p.first_name, p.last_name, p.phone, 
                p.date_of_birth, p.gender, p.blood_type,
                MAX(a.appointment_date) as last_appointment
            FROM patients p
            JOIN appointments a ON p.id = a.patient_id
            WHERE a.doctor_id = ?
            GROUP BY p.id
            ORDER BY p.last_name, p.first_name
        `, [req.doctor.id]);

        res.json({
            success: true,
            data: { patients }
        });

    } catch (error) {
        console.error('Get doctor patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get patients'
        });
    }
});

module.exports = router;