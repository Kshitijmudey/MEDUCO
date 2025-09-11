const express = require('express');
const database = require('../config/database');
const { authenticateToken, getPatientInfo, getDoctorInfo } = require('../middleware/auth');
const { validateAppointment } = require('../middleware/validation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get appointments
router.get('/', async (req, res) => {
    try {
        const { status, date, limit = 20, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                a.id, a.appointment_date, a.appointment_time, a.duration, a.type, a.status,
                a.reason, a.notes, a.diagnosis, a.prescription, a.created_at,
                p.first_name as patient_first_name, p.last_name as patient_last_name, p.patient_id,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.specialization
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE 1=1
        `;
        
        const queryParams = [];

        // Filter by user role
        if (req.user.role === 'patient') {
            query += ' AND p.user_id = ?';
            queryParams.push(req.user.id);
        } else if (req.user.role === 'doctor') {
            query += ' AND d.user_id = ?';
            queryParams.push(req.user.id);
        }

        if (status) {
            query += ' AND a.status = ?';
            queryParams.push(status);
        }

        if (date) {
            query += ' AND a.appointment_date = ?';
            queryParams.push(date);
        }

        query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        const appointments = await database.all(query, queryParams);

        res.json({
            success: true,
            data: { appointments }
        });

    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get appointments'
        });
    }
});

// Create new appointment (patients only)
router.post('/', validateAppointment, getPatientInfo, async (req, res) => {
    try {
        if (req.user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can request appointments'
            });
        }

        const { doctorId, appointmentDate, appointmentTime, type, reason } = req.body;

        // Check if doctor exists
        const doctor = await database.get('SELECT id FROM doctors WHERE id = ?', [doctorId]);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Check for scheduling conflicts
        const conflictingAppointment = await database.get(`
            SELECT id FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? 
            AND status NOT IN ('cancelled', 'no-show')
        `, [doctorId, appointmentDate, appointmentTime]);

        if (conflictingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked'
            });
        }

        const result = await database.run(`
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `, [req.patient.id, doctorId, appointmentDate, appointmentTime, type, reason]);

        res.status(201).json({
            success: true,
            message: 'Appointment requested successfully',
            data: { appointmentId: result.id }
        });

    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create appointment'
        });
    }
});

// Update appointment
router.put('/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { status, notes, diagnosis, prescription } = req.body;

        // Get appointment
        const appointment = await database.get(`
            SELECT a.*, p.user_id as patient_user_id, d.user_id as doctor_user_id
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.id = ?
        `, [appointmentId]);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check permissions
        if (req.user.role === 'patient' && req.user.id !== appointment.patient_user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own appointments'
            });
        }

        if (req.user.role === 'doctor' && req.user.id !== appointment.doctor_user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update appointments with your patients'
            });
        }

        const updateFields = [];
        const updateValues = [];

        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        if (notes !== undefined) {
            updateFields.push('notes = ?');
            updateValues.push(notes);
        }
        if (diagnosis !== undefined && req.user.role === 'doctor') {
            updateFields.push('diagnosis = ?');
            updateValues.push(diagnosis);
        }
        if (prescription !== undefined && req.user.role === 'doctor') {
            updateFields.push('prescription = ?');
            updateValues.push(prescription);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(appointmentId);

        await database.run(
            `UPDATE appointments SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Appointment updated successfully'
        });

    } catch (error) {
        console.error('Update appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update appointment'
        });
    }
});

module.exports = router;