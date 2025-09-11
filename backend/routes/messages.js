const express = require('express');
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get messages
router.get('/', async (req, res) => {
    try {
        const { type = 'inbox', limit = 20, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                m.id, m.subject, m.message, m.is_urgent, m.is_read, m.created_at, m.read_at,
                m.sender_type, m.recipient_type,
                sender_user.email as sender_email,
                recipient_user.email as recipient_email,
                CASE 
                    WHEN m.sender_type = 'patient' THEN sender_patient.first_name || ' ' || sender_patient.last_name
                    WHEN m.sender_type = 'doctor' THEN 'Dr. ' || sender_doctor.first_name || ' ' || sender_doctor.last_name
                END as sender_name,
                CASE 
                    WHEN m.recipient_type = 'patient' THEN recipient_patient.first_name || ' ' || recipient_patient.last_name
                    WHEN m.recipient_type = 'doctor' THEN 'Dr. ' || recipient_doctor.first_name || ' ' || recipient_doctor.last_name
                END as recipient_name
            FROM messages m
            JOIN users sender_user ON m.sender_id = sender_user.id
            JOIN users recipient_user ON m.recipient_id = recipient_user.id
            LEFT JOIN patients sender_patient ON m.sender_id = sender_patient.user_id AND m.sender_type = 'patient'
            LEFT JOIN doctors sender_doctor ON m.sender_id = sender_doctor.user_id AND m.sender_type = 'doctor'
            LEFT JOIN patients recipient_patient ON m.recipient_id = recipient_patient.user_id AND m.recipient_type = 'patient'
            LEFT JOIN doctors recipient_doctor ON m.recipient_id = recipient_doctor.user_id AND m.recipient_type = 'doctor'
            WHERE 1=1
        `;
        
        const queryParams = [];

        if (type === 'inbox') {
            query += ' AND m.recipient_id = ?';
            queryParams.push(req.user.id);
        } else if (type === 'sent') {
            query += ' AND m.sender_id = ?';
            queryParams.push(req.user.id);
        }

        query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        const messages = await database.all(query, queryParams);

        res.json({
            success: true,
            data: { messages }
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get messages'
        });
    }
});

// Send new message
router.post('/', validateMessage, async (req, res) => {
    try {
        const { recipientId, subject, message, isUrgent = false } = req.body;

        // Validate recipient exists and determine recipient type
        const recipient = await database.get('SELECT id, role FROM users WHERE id = ?', [recipientId]);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        const senderType = req.user.role;
        const recipientType = recipient.role;

        const result = await database.run(`
            INSERT INTO messages (sender_id, recipient_id, sender_type, recipient_type, subject, message, is_urgent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, recipientId, senderType, recipientType, subject, message, isUrgent ? 1 : 0]);

        // Create notification for recipient
        await database.run(`
            INSERT INTO notifications (user_id, title, message, type, priority)
            VALUES (?, ?, ?, 'message', ?)
        `, [
            recipientId,
            `New message: ${subject}`,
            `You have received a new message from ${req.user.email}`,
            isUrgent ? 'high' : 'medium'
        ]);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: { messageId: result.id }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
    try {
        const messageId = req.params.id;

        // Verify message exists and user is recipient
        const message = await database.get(
            'SELECT id, recipient_id FROM messages WHERE id = ?',
            [messageId]
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message.recipient_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only mark your own messages as read'
            });
        }

        await database.run(
            'UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?',
            [messageId]
        );

        res.json({
            success: true,
            message: 'Message marked as read'
        });

    } catch (error) {
        console.error('Mark message as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark message as read'
        });
    }
});

// Get message thread
router.get('/:id/thread', async (req, res) => {
    try {
        const messageId = req.params.id;

        // Get the main message first
        const mainMessage = await database.get(`
            SELECT 
                m.id, m.subject, m.message, m.is_urgent, m.is_read, m.created_at,
                m.sender_id, m.recipient_id, m.sender_type, m.recipient_type,
                sender_user.email as sender_email,
                recipient_user.email as recipient_email
            FROM messages m
            JOIN users sender_user ON m.sender_id = sender_user.id
            JOIN users recipient_user ON m.recipient_id = recipient_user.id
            WHERE m.id = ? AND (m.sender_id = ? OR m.recipient_id = ?)
        `, [messageId, req.user.id, req.user.id]);

        if (!mainMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found or access denied'
            });
        }

        // Get all messages in the thread (replies)
        const threadMessages = await database.all(`
            SELECT 
                m.id, m.subject, m.message, m.is_urgent, m.is_read, m.created_at,
                m.sender_id, m.recipient_id, m.sender_type, m.recipient_type,
                sender_user.email as sender_email,
                recipient_user.email as recipient_email
            FROM messages m
            JOIN users sender_user ON m.sender_id = sender_user.id
            JOIN users recipient_user ON m.recipient_id = recipient_user.id
            WHERE (m.id = ? OR m.parent_message_id = ?) 
            AND (m.sender_id = ? OR m.recipient_id = ?)
            ORDER BY m.created_at ASC
        `, [messageId, messageId, req.user.id, req.user.id]);

        res.json({
            success: true,
            data: { messages: threadMessages }
        });

    } catch (error) {
        console.error('Get message thread error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get message thread'
        });
    }
});

module.exports = router;