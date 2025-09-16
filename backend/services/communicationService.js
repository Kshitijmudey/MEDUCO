const twilio = require('twilio');
const nodemailer = require('nodemailer');
const database = require('../config/database');

class CommunicationService {
    constructor() {
        // Twilio configuration
        this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

        // Email configuration
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Send SMS message
     * @param {string} to - Recipient phone number
     * @param {string} message - Message content
     * @returns {Object} Send result
     */
    async sendSMS(to, message) {
        try {
            if (!this.twilioClient || !this.twilioPhoneNumber) {
                console.warn('Twilio not configured, SMS not sent');
                return { success: false, message: 'SMS service not configured' };
            }

            // Ensure phone number is in E.164 format
            const formattedNumber = this.formatPhoneNumber(to);

            const result = await this.twilioClient.messages.create({
                body: message,
                from: this.twilioPhoneNumber,
                to: formattedNumber
            });

            // Log SMS in database
            await this.logCommunication('sms', to, message, 'sent', result.sid);

            return {
                success: true,
                messageId: result.sid,
                status: result.status
            };
        } catch (error) {
            console.error('SMS sending error:', error);

            // Log failed SMS
            await this.logCommunication('sms', to, message, 'failed', null, error.message);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send email message
     * @param {string} to - Recipient email
     * @param {string} subject - Email subject
     * @param {string} message - Email content
     * @param {string} html - HTML content (optional)
     * @returns {Object} Send result
     */
    async sendEmail(to, subject, message, html = null) {
        try {
            if (!this.emailTransporter) {
                console.warn('Email transporter not configured, email not sent');
                return { success: false, message: 'Email service not configured' };
            }

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: to,
                subject: subject,
                text: message,
                ...(html && { html: html })
            };

            const result = await this.emailTransporter.sendMail(mailOptions);

            // Log email in database
            await this.logCommunication('email', to, `${subject}: ${message}`, 'sent', result.messageId);

            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            console.error('Email sending error:', error);

            // Log failed email
            await this.logCommunication('email', to, `${subject}: ${message}`, 'failed', null, error.message);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send both SMS and email
     * @param {string} phone - Phone number
     * @param {string} email - Email address
     * @param {string} message - Message content
     * @param {string} subject - Email subject (optional)
     * @returns {Object} Send results
     */
    async sendBoth(phone, email, message, subject = 'MEDUCO Health Reminder') {
        const results = {
            sms: null,
            email: null
        };

        // Send SMS if phone provided
        if (phone) {
            results.sms = await this.sendSMS(phone, message);
        }

        // Send email if email provided
        if (email) {
            results.email = await this.sendEmail(email, subject, message);
        }

        return results;
    }

    /**
     * Format phone number to E.164 format
     * @param {string} phone - Phone number
     * @returns {string} Formatted phone number
     */
    formatPhoneNumber(phone) {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // Add country code if not present (assuming US)
        if (cleaned.length === 10) {
            cleaned = '1' + cleaned;
        }

        return '+' + cleaned;
    }

    /**
     * Log communication in database
     * @param {string} type - Communication type (sms/email)
     * @param {string} recipient - Recipient contact
     * @param {string} content - Message content
     * @param {string} status - Status (sent/failed)
     * @param {string} externalId - External service ID
     * @param {string} error - Error message if failed
     */
    async logCommunication(type, recipient, content, status, externalId = null, error = null) {
        try {
            await database.run(`
                INSERT INTO communication_logs (type, recipient, content, status, external_id, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [type, recipient, content, status, externalId, error]);
        } catch (logError) {
            console.error('Failed to log communication:', logError);
        }
    }

    /**
     * Get communication logs
     * @param {number} limit - Number of records to fetch
     * @returns {Array} Communication logs
     */
    async getCommunicationLogs(limit = 50) {
        try {
            return await database.all(`
                SELECT * FROM communication_logs
                ORDER BY created_at DESC
                LIMIT ?
            `, [limit]);
        } catch (error) {
            console.error('Failed to get communication logs:', error);
            return [];
        }
    }

    /**
     * Test SMS functionality
     * @param {string} testNumber - Test phone number
     * @returns {Object} Test result
     */
    async testSMS(testNumber) {
        const testMessage = 'MEDUCO Test SMS - Your SMS service is working correctly!';
        return await this.sendSMS(testNumber, testMessage);
    }

    /**
     * Send both SMS and email
     * @param {string} phone - Phone number
     * @param {string} email - Email address
     * @param {string} message - Message content
     * @param {string} subject - Email subject
     * @returns {Object} Send results
     */
    async sendBoth(phone, email, message, subject) {
        const results = {
            sms: null,
            email: null
        };

        try {
            results.sms = await this.sendSMS(phone, message);
        } catch (error) {
            console.error('Error sending SMS:', error);
            results.sms = { success: false, error: error.message };
        }

        try {
            results.email = await this.sendEmail(email, subject, message);
        } catch (error) {
            console.error('Error sending email:', error);
            results.email = { success: false, error: error.message };
        }

        return results;
    }

    /**
     * Test email functionality
     * @param {string} testEmail - Test email address
     * @returns {Object} Test result
     */
    async testEmail(testEmail) {
        const testSubject = 'MEDUCO Test Email';
        const testMessage = 'MEDUCO Test Email - Your email service is working correctly!';
        return await this.sendEmail(testEmail, testSubject, testMessage);
    }
}

module.exports = new CommunicationService();
