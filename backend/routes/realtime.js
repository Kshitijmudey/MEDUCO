const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const realTimeService = require('../services/realTimeService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Server-Sent Events endpoint for real-time updates
router.get('/events', authenticateToken, async (req, res) => {
    try {
        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        });

        // Generate unique connection ID
        const connectionId = uuidv4();
        const userId = req.user.id;
        const userRole = req.user.role;

        // Initialize real-time service if not already done
        if (!realTimeService.isInitialized) {
            await realTimeService.initialize();
        }

        // Register the connection
        realTimeService.registerConnection(connectionId, userId, userRole, res);

        // Send initial heartbeat
        const heartbeat = setInterval(() => {
            res.write(`data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
            })}\n\n`);
        }, 30000); // Every 30 seconds

        // Clean up on connection close
        req.on('close', () => {
            clearInterval(heartbeat);
            realTimeService.unregisterConnection(connectionId);
        });

        req.on('aborted', () => {
            clearInterval(heartbeat);
            realTimeService.unregisterConnection(connectionId);
        });

    } catch (error) {
        console.error('Real-time connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to establish real-time connection'
        });
    }
});

// Get real-time service statistics (admin only)
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const stats = realTimeService.getStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error getting real-time stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get real-time statistics'
        });
    }
});

// Send system announcement (admin only)
router.post('/announcement', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { message, priority = 'medium' } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        realTimeService.sendSystemAnnouncement(message, priority);

        res.json({
            success: true,
            message: 'Announcement sent successfully'
        });

    } catch (error) {
        console.error('Error sending announcement:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send announcement'
        });
    }
});

// Test real-time notification (development only)
router.post('/test-notification', authenticateToken, async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Test endpoints not available in production'
            });
        }

        const { type, data, targetUserId } = req.body;

        const notificationData = {
            type: type || 'test_notification',
            timestamp: new Date().toISOString(),
            data: data || { message: 'This is a test notification' }
        };

        if (targetUserId) {
            realTimeService.sendToUser(parseInt(targetUserId), notificationData);
        } else {
            realTimeService.sendToUser(req.user.id, notificationData);
        }

        res.json({
            success: true,
            message: 'Test notification sent'
        });

    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test notification'
        });
    }
});

// Get active connections for a user (own connections only)
router.get('/connections', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userSessions = realTimeService.userSessions.get(userId);

        const connectionCount = userSessions ? userSessions.size : 0;

        res.json({
            success: true,
            data: {
                userId: userId,
                activeConnections: connectionCount,
                isConnected: connectionCount > 0
            }
        });

    } catch (error) {
        console.error('Error getting user connections:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get connection status'
        });
    }
});

// Trigger health record update notification (for testing)
router.post('/trigger/health-record', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Patient access required'
            });
        }

        const { patientId, recordData } = req.body;

        // Get patient info from user
        const patient = await database.get(
            'SELECT id FROM patients WHERE user_id = $1',
            [req.user.id]
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient profile not found'
            });
        }

        await realTimeService.handleHealthRecordUpdate(patient.id, recordData);

        res.json({
            success: true,
            message: 'Health record update notification triggered'
        });

    } catch (error) {
        console.error('Error triggering health record update:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger health record update'
        });
    }
});

module.exports = router;
