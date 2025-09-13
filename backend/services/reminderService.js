const cron = require('node-cron');
const database = require('../config/database');
const aiService = require('./aiService');
const communicationService = require('./communicationService');

class ReminderService {
    constructor() {
        this.scheduledJobs = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the reminder service
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('Initializing Reminder Service...');

        // Schedule daily medication reminders (8 AM)
        this.scheduleMedicationReminders();

        // Schedule appointment reminders (1 day before, 2 hours before)
        this.scheduleAppointmentReminders();

        // Schedule care plan task reminders
        this.scheduleCarePlanReminders();

        this.isInitialized = true;
        console.log('Reminder Service initialized successfully');
    }

    /**
     * Schedule daily medication reminders
     */
    scheduleMedicationReminders() {
        // Run every day at 8 AM
        const job = cron.schedule('0 8 * * *', async () => {
            console.log('Running daily medication reminders...');
            await this.sendMedicationReminders();
        }, {
            timezone: "America/New_York" // Adjust timezone as needed
        });

        this.scheduledJobs.set('medication-daily', job);
    }

    /**
     * Schedule appointment reminders
     */
    scheduleAppointmentReminders() {
        // Run every day at 9 AM for next day appointments
        const nextDayJob = cron.schedule('0 9 * * *', async () => {
            console.log('Running next day appointment reminders...');
            await this.sendAppointmentReminders(1); // 1 day before
        });

        // Run every 2 hours for same day appointments
        const sameDayJob = cron.schedule('0 */2 * * *', async () => {
            console.log('Running same day appointment reminders...');
            await this.sendAppointmentReminders(0); // Same day
        });

        this.scheduledJobs.set('appointment-next-day', nextDayJob);
        this.scheduledJobs.set('appointment-same-day', sameDayJob);
    }

    /**
     * Schedule care plan task reminders
     */
    scheduleCarePlanReminders() {
        // Run daily at 7 AM for daily tasks
        const dailyJob = cron.schedule('0 7 * * *', async () => {
            console.log('Running daily care plan task reminders...');
            await this.sendCarePlanReminders('daily');
        });

        // Run weekly on Monday at 8 AM for weekly tasks
        const weeklyJob = cron.schedule('0 8 * * 1', async () => {
            console.log('Running weekly care plan task reminders...');
            await this.sendCarePlanReminders('weekly');
        });

        this.scheduledJobs.set('care-plan-daily', dailyJob);
        this.scheduledJobs.set('care-plan-weekly', weeklyJob);
    }

    /**
     * Send medication reminders to all active patients
     */
    async sendMedicationReminders() {
        try {
            // Get all active medications with patient details
            const medications = await database.all(`
                SELECT
                    m.*,
                    p.first_name, p.last_name, p.phone,
                    u.email,
                    d.first_name as doctor_first_name, d.last_name as doctor_last_name,
                    cp.title as care_plan_title, cp.goals as care_plan_goals
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                JOIN doctors d ON m.doctor_id = d.id
                LEFT JOIN care_plans cp ON cp.patient_id = p.id AND cp.status = 'active'
                WHERE m.is_active = 1
                AND u.is_active = 1
                AND p.phone IS NOT NULL
            `);

            for (const medication of medications) {
                try {
                    // Generate AI-powered reminder message
                    const message = await aiService.generateMedicationReminder(
                        medication,
                        { first_name: medication.first_name, last_name: medication.last_name },
                        medication.care_plan_title ? {
                            title: medication.care_plan_title,
                            goals: medication.care_plan_goals
                        } : null
                    );

                    // Send via SMS and email
                    await communicationService.sendBoth(
                        medication.phone,
                        medication.email,
                        message,
                        'MEDUCO Medication Reminder'
                    );

                    // Also create in-app notification
                    await database.run(`
                        INSERT INTO notifications (user_id, title, message, type, priority)
                        VALUES (?, ?, ?, 'medication', 'medium')
                    `, [
                        medication.user_id,
                        'Medication Reminder',
                        message
                    ]);

                } catch (error) {
                    console.error(`Failed to send medication reminder for patient ${medication.patient_id}:`, error);
                }
            }

            console.log(`Sent medication reminders to ${medications.length} patients`);

        } catch (error) {
            console.error('Error sending medication reminders:', error);
        }
    }

    /**
     * Send appointment reminders
     * @param {number} daysAhead - Days ahead to send reminders (0 for same day, 1 for next day)
     */
    async sendAppointmentReminders(daysAhead = 1) {
        try {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysAhead);
            const dateStr = targetDate.toISOString().split('T')[0];

            // Get appointments for the target date
            const appointments = await database.all(`
                SELECT
                    a.*,
                    p.first_name, p.last_name, p.phone,
                    u.email,
                    d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.specialization
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                JOIN doctors d ON a.doctor_id = d.id
                WHERE a.appointment_date = ?
                AND a.status IN ('confirmed', 'pending')
                AND u.is_active = 1
                AND p.phone IS NOT NULL
            `, [dateStr]);

            for (const appointment of appointments) {
                try {
                    // Generate AI-powered reminder message
                    const message = await aiService.generateAppointmentReminder(
                        appointment,
                        { first_name: appointment.first_name, last_name: appointment.last_name },
                        {
                            first_name: appointment.doctor_first_name,
                            last_name: appointment.doctor_last_name,
                            specialization: appointment.specialization
                        }
                    );

                    // Send via SMS and email
                    await communicationService.sendBoth(
                        appointment.phone,
                        appointment.email,
                        message,
                        'MEDUCO Appointment Reminder'
                    );

                    // Also create in-app notification
                    await database.run(`
                        INSERT INTO notifications (user_id, title, message, type, priority)
                        VALUES (?, ?, ?, 'appointment', 'high')
                    `, [
                        appointment.user_id,
                        'Appointment Reminder',
                        message
                    ]);

                } catch (error) {
                    console.error(`Failed to send appointment reminder for appointment ${appointment.id}:`, error);
                }
            }

            console.log(`Sent appointment reminders for ${appointments.length} appointments (${daysAhead} day${daysAhead !== 1 ? 's' : ''} ahead)`);

        } catch (error) {
            console.error('Error sending appointment reminders:', error);
        }
    }

    /**
     * Send care plan task reminders
     * @param {string} frequency - Frequency of tasks to remind ('daily' or 'weekly')
     */
    async sendCarePlanReminders(frequency) {
        try {
            // Get active care plan tasks with the specified frequency
            const tasks = await database.all(`
                SELECT
                    cpt.*,
                    cp.title as care_plan_title, cp.goals as care_plan_goals,
                    p.first_name, p.last_name, p.phone,
                    u.email
                FROM care_plan_tasks cpt
                JOIN care_plans cp ON cpt.care_plan_id = cp.id
                JOIN patients p ON cp.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE cp.status = 'active'
                AND cpt.frequency = ?
                AND cpt.is_completed = 0
                AND u.is_active = 1
                AND p.phone IS NOT NULL
            `, [frequency]);

            for (const task of tasks) {
                try {
                    // Generate AI-powered reminder message
                    const message = await aiService.generateCarePlanReminder(
                        task,
                        {
                            title: task.care_plan_title,
                            goals: task.care_plan_goals
                        },
                        { first_name: task.first_name, last_name: task.last_name }
                    );

                    // Send via SMS and email
                    await communicationService.sendBoth(
                        task.phone,
                        task.email,
                        message,
                        'MEDUCO Care Plan Reminder'
                    );

                    // Also create in-app notification
                    await database.run(`
                        INSERT INTO notifications (user_id, title, message, type, priority)
                        VALUES (?, ?, ?, 'reminder', 'medium')
                    `, [
                        task.user_id,
                        'Care Plan Task Reminder',
                        message
                    ]);

                } catch (error) {
                    console.error(`Failed to send care plan reminder for task ${task.id}:`, error);
                }
            }

            console.log(`Sent care plan reminders for ${tasks.length} ${frequency} tasks`);

        } catch (error) {
            console.error('Error sending care plan reminders:', error);
        }
    }

    /**
     * Send welcome message to new user
     * @param {Object} user - User details
     * @param {string} role - User role
     */
    async sendWelcomeMessage(user, role) {
        try {
            // Generate AI-powered welcome message
            const message = await aiService.generateWelcomeMessage(user, role);

            // Get user contact details
            let contactInfo = null;
            if (role === 'patient') {
                contactInfo = await database.get(`
                    SELECT phone FROM patients WHERE user_id = ?
                `, [user.id]);
            } else if (role === 'doctor') {
                contactInfo = await database.get(`
                    SELECT phone FROM doctors WHERE user_id = ?
                `, [user.id]);
            }

            if (contactInfo && contactInfo.phone) {
                // Send via SMS and email
                await communicationService.sendBoth(
                    contactInfo.phone,
                    user.email,
                    message,
                    'Welcome to MEDUCO'
                );
            } else {
                // Send only email if no phone
                await communicationService.sendEmail(
                    user.email,
                    'Welcome to MEDUCO',
                    message
                );
            }

            console.log(`Sent welcome message to ${role}: ${user.email}`);

        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }

    /**
     * Send appointment approval notification to patient
     * @param {Object} appointment - Appointment details
     */
    async sendAppointmentApprovalNotification(appointment) {
        try {
            // Get patient and doctor details
            const patient = await database.get(`
                SELECT p.first_name, p.last_name, p.phone, u.email
                FROM patients p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [appointment.patient_id]);

            const doctor = await database.get(`
                SELECT first_name, last_name, specialization
                FROM doctors
                WHERE id = ?
            `, [appointment.doctor_id]);

            if (!patient || !doctor) {
                console.error('Patient or doctor not found for appointment approval notification');
                return;
            }

            // Generate AI-powered approval message
            const message = await aiService.generateAppointmentReminder(
                appointment,
                { first_name: patient.first_name, last_name: patient.last_name },
                {
                    first_name: doctor.first_name,
                    last_name: doctor.last_name,
                    specialization: doctor.specialization
                }
            );

            // Send via SMS and email
            await communicationService.sendBoth(
                patient.phone,
                patient.email,
                message,
                'Appointment Confirmed - MEDUCO'
            );

            // Also create in-app notification
            await database.run(`
                INSERT INTO notifications (user_id, title, message, type, priority)
                VALUES (?, ?, ?, 'appointment', 'high')
            `, [
                patient.user_id,
                'Appointment Confirmed',
                message
            ]);

            console.log(`Sent appointment approval notification to patient: ${patient.email}`);

        } catch (error) {
            console.error('Error sending appointment approval notification:', error);
        }
    }

    /**
     * Manually trigger medication reminders (for testing)
     */
    async triggerMedicationReminders() {
        console.log('Manually triggering medication reminders...');
        await this.sendMedicationReminders();
    }

    /**
     * Manually trigger appointment reminders (for testing)
     * @param {number} daysAhead - Days ahead
     */
    async triggerAppointmentReminders(daysAhead = 1) {
        console.log(`Manually triggering appointment reminders (${daysAhead} days ahead)...`);
        await this.sendAppointmentReminders(daysAhead);
    }

    /**
     * Manually trigger care plan reminders (for testing)
     * @param {string} frequency - Frequency
     */
    async triggerCarePlanReminders(frequency = 'daily') {
        console.log(`Manually triggering ${frequency} care plan reminders...`);
        await this.sendCarePlanReminders(frequency);
    }

    /**
     * Stop all scheduled jobs
     */
    stop() {
        console.log('Stopping Reminder Service...');
        for (const [name, job] of this.scheduledJobs) {
            job.stop();
            console.log(`Stopped job: ${name}`);
        }
        this.scheduledJobs.clear();
        this.isInitialized = false;
    }

    /**
     * Get status of scheduled jobs
     */
    getStatus() {
        const jobs = {};
        for (const [name, job] of this.scheduledJobs) {
            jobs[name] = {
                running: job.running,
                scheduled: true
            };
        }
        return {
            initialized: this.isInitialized,
            jobs: jobs
        };
    }
}

module.exports = new ReminderService();
