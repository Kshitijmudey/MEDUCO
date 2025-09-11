const express = require('express');
const database = require('../config/database');
const { authenticateToken, requireDoctorOrAdmin } = require('../middleware/auth');
const { validateCarePlan } = require('../middleware/validation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get care plans
router.get('/', async (req, res) => {
    try {
        const { patientId, status, limit = 20, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                cp.id, cp.title, cp.description, cp.start_date, cp.end_date, 
                cp.status, cp.goals, cp.instructions, cp.created_at, cp.updated_at,
                p.first_name as patient_first_name, p.last_name as patient_last_name, p.patient_id,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.specialization
            FROM care_plans cp
            JOIN patients p ON cp.patient_id = p.id
            JOIN doctors d ON cp.doctor_id = d.id
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
            query += ' AND cp.patient_id = ?';
            queryParams.push(patientId);
        }

        if (status) {
            query += ' AND cp.status = ?';
            queryParams.push(status);
        }

        query += ' ORDER BY cp.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        const carePlans = await database.all(query, queryParams);

        res.json({
            success: true,
            data: { carePlans }
        });

    } catch (error) {
        console.error('Get care plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get care plans'
        });
    }
});

// Create care plan (doctors only)
router.post('/', requireDoctorOrAdmin, validateCarePlan, async (req, res) => {
    try {
        const { patientId, title, description, startDate, endDate, goals, instructions } = req.body;

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
            INSERT INTO care_plans (patient_id, doctor_id, title, description, start_date, end_date, goals, instructions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [patientId, doctor.id, title, description, startDate, endDate || null, goals || null, instructions || null]);

        res.status(201).json({
            success: true,
            message: 'Care plan created successfully',
            data: { carePlanId: result.id }
        });

    } catch (error) {
        console.error('Create care plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create care plan'
        });
    }
});

// Get care plan tasks
router.get('/:id/tasks', async (req, res) => {
    try {
        const carePlanId = req.params.id;

        // Verify care plan exists and user has access
        const carePlan = await database.get(`
            SELECT cp.*, p.user_id as patient_user_id, d.user_id as doctor_user_id
            FROM care_plans cp
            JOIN patients p ON cp.patient_id = p.id
            JOIN doctors d ON cp.doctor_id = d.id
            WHERE cp.id = ?
        `, [carePlanId]);

        if (!carePlan) {
            return res.status(404).json({
                success: false,
                message: 'Care plan not found'
            });
        }

        // Check permissions
        if (req.user.role === 'patient' && req.user.id !== carePlan.patient_user_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (req.user.role === 'doctor' && req.user.id !== carePlan.doctor_user_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const tasks = await database.all(`
            SELECT id, task_name, description, frequency, due_date, is_completed, completed_at, notes, created_at
            FROM care_plan_tasks
            WHERE care_plan_id = ?
            ORDER BY due_date ASC, created_at DESC
        `, [carePlanId]);

        res.json({
            success: true,
            data: { tasks }
        });

    } catch (error) {
        console.error('Get care plan tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get care plan tasks'
        });
    }
});

// Update care plan task completion
router.put('/tasks/:taskId/complete', async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { isCompleted, notes } = req.body;

        // Get task and verify permissions
        const task = await database.get(`
            SELECT cpt.*, cp.patient_id, p.user_id as patient_user_id
            FROM care_plan_tasks cpt
            JOIN care_plans cp ON cpt.care_plan_id = cp.id
            JOIN patients p ON cp.patient_id = p.id
            WHERE cpt.id = ?
        `, [taskId]);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Only patients can mark their own tasks as complete
        if (req.user.role === 'patient' && req.user.id !== task.patient_user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own care plan tasks'
            });
        }

        const updateFields = ['is_completed = ?'];
        const updateValues = [isCompleted ? 1 : 0];

        if (isCompleted) {
            updateFields.push('completed_at = CURRENT_TIMESTAMP');
        } else {
            updateFields.push('completed_at = NULL');
        }

        if (notes !== undefined) {
            updateFields.push('notes = ?');
            updateValues.push(notes);
        }

        updateValues.push(taskId);

        await database.run(
            `UPDATE care_plan_tasks SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Task updated successfully'
        });

    } catch (error) {
        console.error('Update care plan task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task'
        });
    }
});

module.exports = router;