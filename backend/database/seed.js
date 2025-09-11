const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'meduco.db');
const db = new sqlite3.Database(dbPath);

const seedData = async () => {
    console.log('Starting database seeding...');
    
    try {
        // Hash passwords
        const patientPassword = await bcrypt.hash('patient123', 12);
        const doctorPassword = await bcrypt.hash('doctor123', 12);
        const adminPassword = await bcrypt.hash('admin123', 12);
        
        // Insert Users
        const insertUser = (email, password, role) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO users (email, password_hash, role, is_active, email_verified) VALUES (?, ?, ?, 1, 1)',
                    [email, password, role],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        // Create users
        const patientUser1 = await insertUser('jane.cooper@email.com', patientPassword, 'patient');
        const patientUser2 = await insertUser('john.doe@email.com', patientPassword, 'patient');
        const patientUser3 = await insertUser('mary.johnson@email.com', patientPassword, 'patient');
        
        const doctorUser1 = await insertUser('dr.smith@meduco.com', doctorPassword, 'doctor');
        const doctorUser2 = await insertUser('dr.lee@meduco.com', doctorPassword, 'doctor');
        const doctorUser3 = await insertUser('dr.johnson@meduco.com', doctorPassword, 'doctor');
        
        const adminUser = await insertUser('admin@meduco.com', adminPassword, 'admin');
        
        console.log('Users created successfully');
        
        // Insert Patients
        const insertPatient = (userId, firstName, lastName, patientId, phone, dob, gender) => {
            return new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO patients (user_id, patient_id, first_name, last_name, phone, date_of_birth, gender, 
                     address, emergency_contact_name, emergency_contact_phone, blood_type) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userId, patientId, firstName, lastName, phone, dob, gender, 
                     '123 Main St, City, State 12345', 'Emergency Contact', '+1234567890', 'O+'],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        const patient1 = await insertPatient(patientUser1, 'Jane', 'Cooper', 'PAT-25-0001', '+1234567890', '1985-06-15', 'female');
        const patient2 = await insertPatient(patientUser2, 'John', 'Doe', 'PAT-25-0002', '+1234567891', '1978-03-22', 'male');
        const patient3 = await insertPatient(patientUser3, 'Mary', 'Johnson', 'PAT-25-0003', '+1234567892', '1992-11-08', 'female');
        
        console.log('Patients created successfully');
        
        // Insert Doctors
        const insertDoctor = (userId, firstName, lastName, doctorId, specialization, department, phone) => {
            return new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO doctors (user_id, doctor_id, first_name, last_name, specialization, 
                     department, phone, years_experience, consultation_fee, license_number) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userId, doctorId, firstName, lastName, specialization, department, phone, 10, 150.00, 'LIC' + Math.random().toString().substr(2, 6)],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        const doctor1 = await insertDoctor(doctorUser1, 'Sarah', 'Smith', 'DOC-001', 'Cardiology', 'Cardiology', '+1234567800');
        const doctor2 = await insertDoctor(doctorUser2, 'Michael', 'Lee', 'DOC-002', 'Endocrinology', 'Endocrinology', '+1234567801');
        const doctor3 = await insertDoctor(doctorUser3, 'Jennifer', 'Johnson', 'DOC-003', 'Primary Care', 'General Medicine', '+1234567802');
        
        console.log('Doctors created successfully');
        
        // Insert Appointments
        const insertAppointment = (patientId, doctorId, date, time, type, status, reason) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [patientId, doctorId, date, time, type, status, reason],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        await insertAppointment(patient1, doctor1, '2025-09-15', '10:30:00', 'follow-up', 'confirmed', 'HbA1c follow-up');
        await insertAppointment(patient1, doctor2, '2025-09-20', '14:00:00', 'consultation', 'pending', 'Diabetes management');
        await insertAppointment(patient2, doctor3, '2025-09-16', '09:00:00', 'routine', 'confirmed', 'Annual check-up');
        await insertAppointment(patient3, doctor1, '2025-09-18', '15:30:00', 'consultation', 'pending', 'Chest pain evaluation');
        
        console.log('Appointments created successfully');
        
        // Insert Health Records
        const insertHealthRecord = (patientId, type, value, unit, notes, recordedAt) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO health_records (patient_id, record_type, value, unit, notes, recorded_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [patientId, type, value, unit, notes, recordedAt],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        // Blood sugar records for Jane Cooper
        await insertHealthRecord(patient1, 'blood_sugar', '126', 'mg/dL', 'Fasting glucose', '2025-09-11 08:00:00');
        await insertHealthRecord(patient1, 'blood_sugar', '145', 'mg/dL', 'Bedtime reading', '2025-09-10 20:00:00');
        await insertHealthRecord(patient1, 'blood_sugar', '118', 'mg/dL', 'After lunch', '2025-09-10 14:00:00');
        await insertHealthRecord(patient1, 'blood_pressure', '140/90', 'mmHg', 'Morning reading', '2025-09-11 08:30:00');
        await insertHealthRecord(patient1, 'weight', '68.5', 'kg', 'Weekly weigh-in', '2025-09-11 07:00:00');
        
        // Records for other patients
        await insertHealthRecord(patient2, 'blood_pressure', '120/80', 'mmHg', 'Normal reading', '2025-09-11 09:00:00');
        await insertHealthRecord(patient2, 'weight', '75.2', 'kg', 'Monthly check', '2025-09-11 08:00:00');
        await insertHealthRecord(patient3, 'heart_rate', '72', 'bpm', 'Resting heart rate', '2025-09-11 10:00:00');
        
        console.log('Health records created successfully');
        
        // Insert Messages
        const insertMessage = (senderId, recipientId, senderType, recipientType, subject, message, isUrgent = false) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO messages (sender_id, recipient_id, sender_type, recipient_type, subject, message, is_urgent) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [senderId, recipientId, senderType, recipientType, subject, message, isUrgent ? 1 : 0],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        await insertMessage(patientUser1, doctorUser1, 'patient', 'doctor', 'Blood pressure concerns', 'Hi Dr. Smith, I\'ve been noticing my blood pressure readings are consistently high. Should I be concerned?', false);
        await insertMessage(doctorUser1, patientUser1, 'doctor', 'patient', 'Re: Blood pressure concerns', 'Hi Jane, thank you for reaching out. Let\'s schedule a follow-up appointment to discuss your readings and possibly adjust your medication.', false);
        await insertMessage(patientUser2, doctorUser3, 'patient', 'doctor', 'Medication side effects', 'Dr. Johnson, I\'ve been experiencing some side effects from my new medication. Can we discuss alternatives?', false);
        
        console.log('Messages created successfully');
        
        // Insert Care Plans
        const insertCarePlan = (patientId, doctorId, title, description, startDate, goals) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO care_plans (patient_id, doctor_id, title, description, start_date, status, goals) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [patientId, doctorId, title, description, startDate, 'active', goals],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        const carePlan1 = await insertCarePlan(
            patient1, 
            doctor2, 
            'Diabetes Management Plan', 
            'Comprehensive diabetes management including medication, diet, and exercise', 
            '2025-09-01',
            'Maintain HbA1c below 7%, achieve target weight, improve medication adherence'
        );
        
        const carePlan2 = await insertCarePlan(
            patient2, 
            doctor3, 
            'Hypertension Management', 
            'Blood pressure control through lifestyle modifications and medication', 
            '2025-08-15',
            'Achieve blood pressure below 130/80, reduce sodium intake, increase physical activity'
        );
        
        console.log('Care plans created successfully');
        
        // Insert Care Plan Tasks
        const insertCarePlanTask = (carePlanId, taskName, description, frequency) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO care_plan_tasks (care_plan_id, task_name, description, frequency) VALUES (?, ?, ?, ?)',
                    [carePlanId, taskName, description, frequency],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        await insertCarePlanTask(carePlan1, 'Monitor Blood Glucose', 'Check blood sugar levels twice daily', 'daily');
        await insertCarePlanTask(carePlan1, 'Take Metformin', 'Take prescribed medication with meals', 'daily');
        await insertCarePlanTask(carePlan1, 'Exercise', '30 minutes of moderate exercise', 'daily');
        await insertCarePlanTask(carePlan1, 'Weight Check', 'Monitor weight weekly', 'weekly');
        
        await insertCarePlanTask(carePlan2, 'Blood Pressure Check', 'Monitor BP twice daily', 'daily');
        await insertCarePlanTask(carePlan2, 'Sodium Tracking', 'Keep sodium intake below 2300mg', 'daily');
        await insertCarePlanTask(carePlan2, 'Medication Adherence', 'Take BP medication as prescribed', 'daily');
        
        console.log('Care plan tasks created successfully');
        
        // Insert Medications
        const insertMedication = (patientId, doctorId, name, dosage, frequency, startDate, instructions) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO medications (patient_id, doctor_id, medication_name, dosage, frequency, start_date, instructions) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [patientId, doctorId, name, dosage, frequency, startDate, instructions],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        await insertMedication(patient1, doctor2, 'Metformin', '500mg', 'Twice daily', '2025-08-01', 'Take with meals to reduce stomach upset');
        await insertMedication(patient1, doctor1, 'Lisinopril', '10mg', 'Once daily', '2025-08-15', 'Take at the same time each day');
        await insertMedication(patient2, doctor3, 'Amlodipine', '5mg', 'Once daily', '2025-08-01', 'Take in the morning');
        await insertMedication(patient3, doctor1, 'Atorvastatin', '20mg', 'Once daily', '2025-09-01', 'Take in the evening');
        
        console.log('Medications created successfully');
        
        // Insert Doctor Availability
        const insertAvailability = (doctorId, dayOfWeek, startTime, endTime) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
                    [doctorId, dayOfWeek, startTime, endTime],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        // Dr. Smith availability (Monday to Friday, 9 AM to 5 PM)
        for (let day = 1; day <= 5; day++) {
            await insertAvailability(doctor1, day, '09:00:00', '17:00:00');
        }
        
        // Dr. Lee availability (Monday to Friday, 8 AM to 4 PM)
        for (let day = 1; day <= 5; day++) {
            await insertAvailability(doctor2, day, '08:00:00', '16:00:00');
        }
        
        // Dr. Johnson availability (Monday to Friday, 10 AM to 6 PM)
        for (let day = 1; day <= 5; day++) {
            await insertAvailability(doctor3, day, '10:00:00', '18:00:00');
        }
        
        console.log('Doctor availability created successfully');
        
        // Insert Notifications
        const insertNotification = (userId, title, message, type, priority = 'medium') => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
                    [userId, title, message, type, priority],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        };
        
        await insertNotification(patientUser1, 'Appointment Reminder', 'You have an appointment with Dr. Smith tomorrow at 10:30 AM', 'appointment', 'high');
        await insertNotification(patientUser1, 'Medication Reminder', 'Time to take your evening Metformin', 'medication', 'medium');
        await insertNotification(patientUser2, 'Lab Results Available', 'Your recent lab results are now available for review', 'alert', 'medium');
        await insertNotification(doctorUser1, 'New Message', 'You have a new message from Jane Cooper', 'message', 'medium');
        
        console.log('Notifications created successfully');
        
        console.log('Database seeding completed successfully!');
        console.log('\n=== SAMPLE LOGIN CREDENTIALS ===');
        console.log('Patients:');
        console.log('  Email: jane.cooper@email.com | Password: patient123');
        console.log('  Email: john.doe@email.com | Password: patient123');
        console.log('  Email: mary.johnson@email.com | Password: patient123');
        console.log('\nDoctors:');
        console.log('  Email: dr.smith@meduco.com | Password: doctor123');
        console.log('  Email: dr.lee@meduco.com | Password: doctor123');
        console.log('  Email: dr.johnson@meduco.com | Password: doctor123');
        console.log('\nAdmin:');
        console.log('  Email: admin@meduco.com | Password: admin123');
        console.log('=====================================\n');
        
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        db.close();
    }
};

seedData();