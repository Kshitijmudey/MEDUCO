const express = require('express');
const database = require('../config/database');
const { authenticateToken, requireDoctorOrAdmin } = require('../middleware/auth');
const { validateMedication } = require('../middleware/validation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get medications
router.get('/', async (req, res) => {
    try {
        const { patientId, isActive = true, limit = 20, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                m.id, m.medication_name, m.dosage, m.frequency, m.start_date, m.end_date,
                m.instructions, m.side_effects, m.is_active, m.created_at, m.updated_at,
                p.first_name as patient_first_name, p.last_name as patient_last_name, p.patient_id,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.specialization
            FROM medications m
            JOIN patients p ON m.patient_id = p.id
            JOIN doctors d ON m.doctor_id = d.id
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

        if (patientId) {
            query += ' AND m.patient_id = ?';
            queryParams.push(patientId);
        }

        if (isActive !== undefined) {
            query += ' AND m.is_active = ?';
            queryParams.push(isActive === 'true' ? 1 : 0);
        }

        query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        const medications = await database.all(query, queryParams);

        res.json({
            success: true,
            data: { medications }
        });

    } catch (error) {
        console.error('Get medications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get medications'
        });
    }
});

// Add medication (doctors only)
router.post('/', requireDoctorOrAdmin, validateMedication, async (req, res) => {
    try {
        const { patientId, medicationName, dosage, frequency, startDate, endDate, instructions, sideEffects } = req.body;

        // Get doctor info
        const doctor = await database.get('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor profile not found'
            });
        }

        // Verify patient exists
        const patient = await database.get('SELECT id FROM patients WHERE id = ?', [patientId]);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        const result = await database.run(`
            INSERT INTO medications (patient_id, doctor_id, medication_name, dosage, frequency, start_date, end_date, instructions, side_effects)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [patientId, doctor.id, medicationName, dosage, frequency, startDate, endDate || null, instructions || null, sideEffects || null]);

        // Create notification for patient
        const patientUser = await database.get('SELECT user_id FROM patients WHERE id = ?', [patientId]);
        if (patientUser) {
            await database.run(`
                INSERT INTO notifications (user_id, title, message, type, priority)
                VALUES (?, ?, ?, 'medication', 'medium')
            `, [
                patientUser.user_id,
                'New Medication Prescribed',
                `Dr. ${req.user.email} has prescribed ${medicationName} for you`
            ]);
        }

        res.status(201).json({
            success: true,
            message: 'Medication added successfully',
            data: { medicationId: result.id }
        });

    } catch (error) {
        console.error('Add medication error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add medication'
        });
    }
});

// Update medication
router.put('/:id', requireDoctorOrAdmin, async (req, res) => {
    try {
        const medicationId = req.params.id;
        const { dosage, frequency, endDate, instructions, sideEffects, isActive } = req.body;

        // Verify medication exists and doctor has permission
        const medication = await database.get(`
            SELECT m.*, d.user_id as doctor_user_id
            FROM medications m
            JOIN doctors d ON m.doctor_id = d.id
            WHERE m.id = ?
        `, [medicationId]);

        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }

        if (req.user.role === 'doctor' && req.user.id !== medication.doctor_user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update medications you prescribed'
            });
        }

        const updateFields = [];
        const updateValues = [];

        if (dosage !== undefined) {
            updateFields.push('dosage = ?');
            updateValues.push(dosage);
        }
        if (frequency !== undefined) {
            updateFields.push('frequency = ?');
            updateValues.push(frequency);
        }
        if (endDate !== undefined) {
            updateFields.push('end_date = ?');
            updateValues.push(endDate);
        }
        if (instructions !== undefined) {
            updateFields.push('instructions = ?');
            updateValues.push(instructions);
        }
        if (sideEffects !== undefined) {
            updateFields.push('side_effects = ?');
            updateValues.push(sideEffects);
        }
        if (isActive !== undefined) {
            updateFields.push('is_active = ?');
            updateValues.push(isActive ? 1 : 0);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(medicationId);

        await database.run(
            `UPDATE medications SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Medication updated successfully'
        });

    } catch (error) {
        console.error('Update medication error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update medication'
        });
    }
});

// Log medication taken
router.post('/:id/log', async (req, res) => {
    try {
        const medicationId = req.params.id;
        const { takenAt, isTaken = true, notes } = req.body;

        // Verify medication exists and user has access
        const medication = await database.get(`
            SELECT m.*, p.user_id as patient_user_id
            FROM medications m
            JOIN patients p ON m.patient_id = p.id
            WHERE m.id = ?
        `, [medicationId]);

        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }

        // Only patients can log their own medications
        if (req.user.role === 'patient' && req.user.id !== medication.patient_user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only log your own medications'
            });
        }

        const result = await database.run(`
            INSERT INTO medication_logs (medication_id, taken_at, is_taken, notes)
            VALUES (?, ?, ?, ?)
        `, [medicationId, takenAt || new Date().toISOString(), isTaken ? 1 : 0, notes || null]);

        res.status(201).json({
            success: true,
            message: 'Medication log created successfully',
            data: { logId: result.id }
        });

    } catch (error) {
        console.error('Log medication error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log medication'
        });
    }
});

// Get medication logs
router.get('/:id/logs', async (req, res) => {
    try {
        const medicationId = req.params.id;
        const { limit = 30, offset = 0 } = req.query;

        // Verify medication exists and user has access
        const medication = await database.get(`
            SELECT m.*, p.user_id as patient_user_id, d.user_id as doctor_user_id
            FROM medications m
            JOIN patients p ON m.patient_id = p.id
            JOIN doctors d ON m.doctor_id = d.id
            WHERE m.id = ?
        `, [medicationId]);

        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }

        // Check permissions
        if (req.user.role === 'patient' && req.user.id !== medication.patient_user_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (req.user.role === 'doctor' && req.user.id !== medication.doctor_user_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const logs = await database.all(`
            SELECT id, taken_at, is_taken, notes, created_at
            FROM medication_logs
            WHERE medication_id = ?
            ORDER BY taken_at DESC
            LIMIT ? OFFSET ?
        `, [medicationId, parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            data: { logs }
        });

    } catch (error) {
        console.error('Get medication logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get medication logs'
        });
    }
});

module.exports = router;