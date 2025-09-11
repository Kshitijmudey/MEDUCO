const express = require('express');
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get notifications
router.get('/', async (req, res) => {
    try {
        const { isRead, type, priority, limit = 20, offset = 0 } = req.query;
        
        let query = `
            SELECT id, title, message, type, priority, is_read, action_url, created_at, read_at
            FROM notifications
            WHERE user_id = ?
        `;
        
        const queryParams = [req.user.id];

        if (isRead !== undefined) {
            query += ' AND is_read = ?';
            queryParams.push(isRead === 'true' ? 1 : 0);
        }

        if (type) {
            query += ' AND type = ?';
            queryParams.push(type);
        }

        if (priority) {
            query += ' AND priority = ?';
            queryParams.push(priority);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        const notifications = await database.all(query, queryParams);

        // Get unread count
        const unreadCount = await database.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount: unreadCount.count
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications'
        });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Verify notification exists and belongs to user
        const notification = await database.get(
            'SELECT id, user_id FROM notifications WHERE id = ?',
            [notificationId]
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        if (notification.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only mark your own notifications as read'
            });
        }

        await database.run(
            'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?',
            [notificationId]
        );

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', async (req, res) => {
    try {
        await database.run(
            'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Verify notification exists and belongs to user
        const notification = await database.get(
            'SELECT id, user_id FROM notifications WHERE id = ?',
            [notificationId]
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        if (notification.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own notifications'
            });
        }

        await database.run('DELETE FROM notifications WHERE id = ?', [notificationId]);

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

module.exports = router;