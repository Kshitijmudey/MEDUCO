const express = require('express');
const database = require('../config/database');
const { authenticateToken, getPatientInfo, getDoctorInfo } = require('../middleware/auth');
const { validateHealthRecord } = require('../middleware/validation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get health records
router.get('/', async (req, res) => {
    try {
        const { recordType, patientId, startDate, endDate, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                hr.id, hr.record_type, hr.value, hr.unit, hr.notes, 
                hr.recorded_at, hr.recorded_by, hr.is_critical, hr.created_at,
                p.first_name as patient_first_name, p.last_name as patient_last_name, p.patient_id
            FROM health_records hr
            JOIN patients p ON hr.patient_id = p.id
            WHERE 1=1
        `;
        
        const queryParams = [];

        // Filter by user role
        if (req.user.role === 'patient') {
            query += ' AND p.user_id = ?';
            queryParams.push(req.user.id);
        } else if (req.user.role === 'doctor' && patientId) {
            query += ' AND hr.patient_id = ?';
            queryParams.push(patientId);
        }

        if (recordType) {
            query += ' AND hr.record_type = ?';
            queryParams.push(recordType);
        }

        if (startDate) {
            query += ' AND hr.recorded_at >= ?';
            queryParams.push(startDate);
        }

        if (endDate) {
            query += ' AND hr.recorded_at <= ?';
            queryParams.push(endDate);
        }

        query += ' ORDER BY hr.recorded_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        const healthRecords = await database.all(query, queryParams);

        res.json({
            success: true,
            data: { healthRecords }
        });

    } catch (error) {
        console.error('Get health records error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get health records'
        });
    }
});

// Create health record
router.post('/', validateHealthRecord, async (req, res) => {
    try {
        const { recordType, value, unit, notes, recordedAt, patientId } = req.body;
        
        let targetPatientId;
        let recordedBy = 'system';

        if (req.user.role === 'patient') {
            // Patient creating their own record
            const patient = await database.get('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: 'Patient profile not found'
                });
            }
            targetPatientId = patient.id;
            recordedBy = 'patient';
        } else if (req.user.role === 'doctor') {
            // Doctor creating record for patient
            if (!patientId) {
                return res.status(400).json({
                    success: false,
                    message: 'Patient ID is required for doctor entries'
                });
            }
            targetPatientId = patientId;
            recordedBy = 'doctor';
        }

        const result = await database.run(`
            INSERT INTO health_records (patient_id, record_type, value, unit, notes, recorded_at, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            targetPatientId,
            recordType,
            value,
            unit || null,
            notes || null,
            recordedAt || new Date().toISOString(),
            recordedBy
        ]);

        res.status(201).json({
            success: true,
            message: 'Health record created successfully',
            data: { recordId: result.id }
        });

    } catch (error) {
        console.error('Create health record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create health record'
        });
    }
});

// Update health record
router.put('/:id', validateHealthRecord, async (req, res) => {
    try {
        const recordId = req.params.id;
        const { value, unit, notes, isCritical } = req.body;

        // Get the record to check permissions
        const record = await database.get(`
            SELECT hr.*, p.user_id as patient_user_id
            FROM health_records hr
            JOIN patients p ON hr.patient_id = p.id
            WHERE hr.id = ?
        `, [recordId]);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Health record not found'
            });
        }

        // Check permissions
        if (req.user.role === 'patient' && req.user.id !== record.patient_user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own health records'
            });
        }

        const updateFields = [];
        const updateValues = [];

        if (value !== undefined) {
            updateFields.push('value = ?');
            updateValues.push(value);
        }
        if (unit !== undefined) {
            updateFields.push('unit = ?');
            updateValues.push(unit);
        }
        if (notes !== undefined) {
            updateFields.push('notes = ?');
            updateValues.push(notes);
        }
        if (isCritical !== undefined && req.user.role === 'doctor') {
            updateFields.push('is_critical = ?');
            updateValues.push(isCritical ? 1 : 0);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateValues.push(recordId);

        await database.run(
            `UPDATE health_records SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Health record updated successfully'
        });

    } catch (error) {
        console.error('Update health record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update health record'
        });
    }
});

module.exports = router;