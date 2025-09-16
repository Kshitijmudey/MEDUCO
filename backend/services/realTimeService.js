const EventEmitter = require('events');
const database = require('../config/database');

class RealTimeService extends EventEmitter {
    constructor() {
        super();
        this.connections = new Map(); // Store active connections
        this.userSessions = new Map(); // Track user sessions
        this.isInitialized = false;
    }

    /**
     * Initialize the real-time service
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🔄 Initializing Real-Time Data Service...');

        // Set up database change listeners
        this.setupDatabaseListeners();

        // Clean up inactive connections every 5 minutes
        setInterval(() => {
            this.cleanupInactiveConnections();
        }, 5 * 60 * 1000);

        this.isInitialized = true;
        console.log('✅ Real-Time Data Service initialized successfully');
    }

    /**
     * Register a new connection
     */
    registerConnection(connectionId, userId, userRole, res) {
        const connection = {
            id: connectionId,
            userId: userId,
            userRole: userRole,
            response: res,
            lastActivity: new Date(),
            isActive: true
        };

        this.connections.set(connectionId, connection);

        // Track user sessions
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, new Set());
        }
        this.userSessions.get(userId).add(connectionId);

        console.log(`📡 New real-time connection registered: ${connectionId} (User: ${userId}, Role: ${userRole})`);

        // Send initial connection confirmation
        this.sendToConnection(connectionId, {
            type: 'connection_established',
            timestamp: new Date().toISOString(),
            message: 'Real-time connection established'
        });

        // Set up connection cleanup on close
        res.on('close', () => {
            this.unregisterConnection(connectionId);
        });
    }

    /**
     * Unregister a connection
     */
    unregisterConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            // Remove from user sessions
            const userSessions = this.userSessions.get(connection.userId);
            if (userSessions) {
                userSessions.delete(connectionId);
                if (userSessions.size === 0) {
                    this.userSessions.delete(connection.userId);
                }
            }

            this.connections.delete(connectionId);
            console.log(`📡 Real-time connection closed: ${connectionId}`);
        }
    }

    /**
     * Send data to a specific connection
     */
    sendToConnection(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (connection && connection.isActive) {
            try {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                connection.response.write(message);
                connection.lastActivity = new Date();
                return true;
            } catch (error) {
                console.error(`Error sending to connection ${connectionId}:`, error);
                this.unregisterConnection(connectionId);
                return false;
            }
        }
        return false;
    }

    /**
     * Send data to all connections for a specific user
     */
    sendToUser(userId, data) {
        const userSessions = this.userSessions.get(userId);
        if (userSessions) {
            userSessions.forEach(connectionId => {
                this.sendToConnection(connectionId, data);
            });
        }
    }

    /**
     * Send data to all connections with a specific role
     */
    sendToRole(role, data) {
        this.connections.forEach((connection, connectionId) => {
            if (connection.userRole === role) {
                this.sendToConnection(connectionId, data);
            }
        });
    }

    /**
     * Broadcast data to all connections
     */
    broadcast(data) {
        this.connections.forEach((connection, connectionId) => {
            this.sendToConnection(connectionId, data);
        });
    }

    /**
     * Handle new health record data
     */
    async handleHealthRecordUpdate(patientId, recordData) {
        try {
            // Get patient and associated doctor information
            const patient = await database.get(
                'SELECT p.*, u.email FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = $1',
                [patientId]
            );

            if (!patient) return;

            // Send to patient
            this.sendToUser(patient.user_id, {
                type: 'health_record_updated',
                timestamp: new Date().toISOString(),
                data: {
                    patientId: patientId,
                    record: recordData,
                    message: 'New health record added'
                }
            });

            // Get patient's doctors and notify them
            const doctors = await database.all(`
                SELECT DISTINCT d.user_id
                FROM doctors d
                JOIN appointments a ON d.id = a.doctor_id
                WHERE a.patient_id = $1
            `, [patientId]);

            doctors.forEach(doctor => {
                this.sendToUser(doctor.user_id, {
                    type: 'patient_health_record_updated',
                    timestamp: new Date().toISOString(),
                    data: {
                        patientName: `${patient.first_name} ${patient.last_name}`,
                        patientId: patientId,
                        record: recordData,
                        message: `New health record for ${patient.first_name} ${patient.last_name}`
                    }
                });
            });

            // Check for critical values
            if (recordData.is_critical) {
                this.sendToRole('doctor', {
                    type: 'critical_health_alert',
                    timestamp: new Date().toISOString(),
                    priority: 'high',
                    data: {
                        patientName: `${patient.first_name} ${patient.last_name}`,
                        patientId: patientId,
                        record: recordData,
                        message: `🚨 Critical health reading for ${patient.first_name} ${patient.last_name}`
                    }
                });
            }

        } catch (error) {
            console.error('Error handling health record update:', error);
        }
    }

    /**
     * Handle appointment updates
     */
    async handleAppointmentUpdate(appointmentId, appointmentData, action = 'updated') {
        try {
            // Get appointment with patient and doctor information
            const appointment = await database.get(`
                SELECT
                    a.*,
                    p.first_name as patient_first_name, p.last_name as patient_last_name, p.user_id as patient_user_id,
                    d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.user_id as doctor_user_id
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN doctors d ON a.doctor_id = d.id
                WHERE a.id = $1
            `, [appointmentId]);

            if (!appointment) return;

            const notificationData = {
                type: `appointment_${action}`,
                timestamp: new Date().toISOString(),
                data: {
                    appointmentId: appointmentId,
                    appointment: appointmentData,
                    patientName: `${appointment.patient_first_name} ${appointment.patient_last_name}`,
                    doctorName: `Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name}`,
                    date: appointment.appointment_date,
                    time: appointment.appointment_time,
                    status: appointment.status
                }
            };

            // Notify patient
            this.sendToUser(appointment.patient_user_id, {
                ...notificationData,
                message: `Your appointment with Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name} has been ${action}`
            });

            // Notify doctor
            this.sendToUser(appointment.doctor_user_id, {
                ...notificationData,
                message: `Appointment with ${appointment.patient_first_name} ${appointment.patient_last_name} has been ${action}`
            });

        } catch (error) {
            console.error('Error handling appointment update:', error);
        }
    }

    /**
     * Handle new messages
     */
    async handleNewMessage(messageId, messageData) {
        try {
            // Get message with sender and recipient information
            const message = await database.get(`
                SELECT
                    m.*,
                    sender.email as sender_email, sender.role as sender_role,
                    recipient.email as recipient_email, recipient.role as recipient_role
                FROM messages m
                JOIN users sender ON m.sender_id = sender.id
                JOIN users recipient ON m.recipient_id = recipient.id
                WHERE m.id = $1
            `, [messageId]);

            if (!message) return;

            // Notify recipient
            this.sendToUser(message.recipient_id, {
                type: 'new_message',
                timestamp: new Date().toISOString(),
                data: {
                    messageId: messageId,
                    senderId: message.sender_id,
                    senderRole: message.sender_role,
                    subject: message.subject,
                    isUrgent: message.is_urgent,
                    message: `New message from ${message.sender_role}`
                }
            });

        } catch (error) {
            console.error('Error handling new message:', error);
        }
    }

    /**
     * Handle medication reminders
     */
    async handleMedicationReminder(medicationId, reminderData) {
        try {
            const medication = await database.get(`
                SELECT m.*, p.user_id, p.first_name, p.last_name
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                WHERE m.id = $1
            `, [medicationId]);

            if (!medication) return;

            this.sendToUser(medication.user_id, {
                type: 'medication_reminder',
                timestamp: new Date().toISOString(),
                data: {
                    medicationId: medicationId,
                    medicationName: medication.medication_name,
                    dosage: medication.dosage,
                    instructions: medication.instructions,
                    message: `Time to take your ${medication.medication_name}`
                }
            });

        } catch (error) {
            console.error('Error handling medication reminder:', error);
        }
    }

    /**
     * Setup database listeners (PostgreSQL NOTIFY/LISTEN would be ideal here)
     * For now, we'll use the service methods called from routes
     */
    setupDatabaseListeners() {
        // This would be where we set up PostgreSQL NOTIFY/LISTEN
        // or implement database change detection
        console.log('📊 Database change listeners configured');
    }

    /**
     * Clean up inactive connections
     */
    cleanupInactiveConnections() {
        const now = new Date();
        const timeoutMs = 30 * 60 * 1000; // 30 minutes

        this.connections.forEach((connection, connectionId) => {
            if (now - connection.lastActivity > timeoutMs) {
                console.log(`🧹 Cleaning up inactive connection: ${connectionId}`);
                this.unregisterConnection(connectionId);
            }
        });
    }

    /**
     * Get service statistics
     */
    getStats() {
        const userRoleStats = {};
        this.connections.forEach(connection => {
            const role = connection.userRole;
            userRoleStats[role] = (userRoleStats[role] || 0) + 1;
        });

        return {
            totalConnections: this.connections.size,
            activeUsers: this.userSessions.size,
            connectionsByRole: userRoleStats,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Send system announcement to all users
     */
    sendSystemAnnouncement(message, priority = 'medium') {
        this.broadcast({
            type: 'system_announcement',
            timestamp: new Date().toISOString(),
            priority: priority,
            data: {
                message: message
            }
        });
    }

    /**
     * Stop the service
     */
    stop() {
        console.log('🛑 Stopping Real-Time Data Service...');

        // Close all connections
        this.connections.forEach((connection, connectionId) => {
            try {
                connection.response.end();
            } catch (error) {
                // Connection might already be closed
            }
        });

        this.connections.clear();
        this.userSessions.clear();
        this.isInitialized = false;

        console.log('✅ Real-Time Data Service stopped');
    }
}

// Create singleton instance
const realTimeService = new RealTimeService();

module.exports = realTimeService;
