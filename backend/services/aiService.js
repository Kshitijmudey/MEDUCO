const OpenAI = require('openai');
const database = require('../config/database');

class AIService {
    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
        } else {
            console.warn('OpenAI API key not found. AI features will use fallback messages.');
            this.openai = null;
        }
    }

    /**
     * Generate personalized medication reminder message
     * @param {Object} medication - Medication details
     * @param {Object} patient - Patient details
     * @param {Object} carePlan - Care plan details (optional)
     * @returns {string} Personalized message
     */
    async generateMedicationReminder(medication, patient, carePlan = null) {
        try {
            const prompt = `Generate a friendly, encouraging medication reminder message for a patient.

Patient Details:
- Name: ${patient.first_name} ${patient.last_name}
- Medication: ${medication.medication_name}
- Dosage: ${medication.dosage}
- Frequency: ${medication.frequency}
- Instructions: ${medication.instructions || 'Take as prescribed'}

${carePlan ? `Care Plan Context: ${carePlan.title} - ${carePlan.goals}` : ''}

The message should be:
- Warm and supportive
- Include specific medication details
- Remind about the importance of adherence
- Keep it under 160 characters for SMS compatibility
- End with an encouraging note

Generate only the message text, no additional formatting.`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a healthcare assistant generating personalized medication reminders. Keep messages concise, friendly, and medically appropriate."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 150,
                temperature: 0.7
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI Service - Medication reminder generation error:', error);
            // Fallback to template message
            return `Hi ${patient.first_name}, time to take your ${medication.dosage} of ${medication.medication_name}. Remember to follow your care plan! Stay healthy! 💊`;
        }
    }

    /**
     * Generate personalized appointment reminder message
     * @param {Object} appointment - Appointment details
     * @param {Object} patient - Patient details
     * @param {Object} doctor - Doctor details
     * @returns {string} Personalized message
     */
    async generateAppointmentReminder(appointment, patient, doctor) {
        try {
            const prompt = `Generate a friendly appointment reminder message for a patient.

Patient Details:
- Name: ${patient.first_name} ${patient.last_name}

Appointment Details:
- Doctor: Dr. ${doctor.first_name} ${doctor.last_name}
- Specialty: ${doctor.specialization}
- Date: ${appointment.appointment_date}
- Time: ${appointment.appointment_time}
- Type: ${appointment.type}
- Reason: ${appointment.reason || 'Regular check-up'}

The message should be:
- Professional yet warm
- Include all appointment details
- Remind about preparation if needed
- Keep it under 160 characters for SMS compatibility
- Include contact information if space allows

Generate only the message text, no additional formatting.`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a healthcare assistant generating appointment reminders. Be clear, professional, and helpful."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 150,
                temperature: 0.6
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI Service - Appointment reminder generation error:', error);
            // Fallback to template message
            return `Hi ${patient.first_name}, reminder: You have an appointment with Dr. ${doctor.first_name} ${doctor.last_name} on ${appointment.appointment_date} at ${appointment.appointment_time}. See you there! 📅`;
        }
    }

    /**
     * Generate personalized care plan task reminder
     * @param {Object} task - Care plan task details
     * @param {Object} carePlan - Care plan details
     * @param {Object} patient - Patient details
     * @returns {string} Personalized message
     */
    async generateCarePlanReminder(task, carePlan, patient) {
        try {
            const prompt = `Generate an encouraging care plan task reminder message.

Patient Details:
- Name: ${patient.first_name} ${patient.last_name}

Care Plan: ${carePlan.title}
Task: ${task.task_name}
Description: ${task.description}
Frequency: ${task.frequency}

The message should be:
- Motivational and supportive
- Specific to the task
- Connect to overall health goals
- Keep it under 160 characters for SMS compatibility
- Include progress encouragement

Generate only the message text, no additional formatting.`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a healthcare assistant generating care plan task reminders. Be encouraging and focus on patient empowerment."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 150,
                temperature: 0.7
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI Service - Care plan reminder generation error:', error);
            // Fallback to template message
            return `Hi ${patient.first_name}, don't forget your care plan task: ${task.task_name}. Every step counts toward better health! 💪`;
        }
    }

    /**
     * Generate welcome message for new users
     * @param {Object} user - User details
     * @param {string} role - User role (patient/doctor)
     * @returns {string} Welcome message
     */
    async generateWelcomeMessage(user, role) {
        try {
            const prompt = `Generate a warm welcome message for a new ${role} user.

User Details:
- Name: ${user.firstName} ${user.lastName}
- Role: ${role}
- Email: ${user.email}

The message should:
- Welcome them to MEDUCO platform
- Thank them for choosing the service
- Include their login credentials reminder
- Provide brief next steps
- Keep it professional and friendly
- Suitable for both SMS and email

Generate only the message text, no additional formatting.`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a healthcare platform assistant generating welcome messages. Be welcoming, informative, and professional."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.6
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI Service - Welcome message generation error:', error);
            // Fallback to template message
            return `Welcome to MEDUCO, ${user.firstName}! Thank you for choosing us. Your account is ready. Login ID: ${user.email}. We're here to support your health journey! 🏥`;
        }
    }
}

module.exports = new AIService();
