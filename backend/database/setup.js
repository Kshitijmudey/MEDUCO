const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'meduco.db');

// Remove existing database file if it exists
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Existing database removed.');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error creating database:', err.message);
        return;
    }
    console.log('Connected to SQLite database.');
});

// SQL Schema for MEDUCO Healthcare Platform
const createTables = `
-- Users table (base table for authentication)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    is_active BOOLEAN DEFAULT 1,
    email_verified BOOLEAN DEFAULT 0,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    phone VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    blood_type VARCHAR(5),
    allergies TEXT,
    medical_history TEXT,
    insurance_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Doctors table
CREATE TABLE doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    doctor_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(200),
    license_number VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    years_experience INTEGER,
    education TEXT,
    certifications TEXT,
    bio TEXT,
    consultation_fee DECIMAL(10,2),
    is_available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Appointments table
CREATE TABLE appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration INTEGER DEFAULT 30, -- in minutes
    type VARCHAR(20) NOT NULL CHECK (type IN ('consultation', 'follow-up', 'emergency', 'routine')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')),
    reason TEXT,
    notes TEXT,
    diagnosis TEXT,
    prescription TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Health Records table
CREATE TABLE health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('blood_sugar', 'blood_pressure', 'weight', 'temperature', 'heart_rate', 'lab_result', 'medication', 'other')),
    value VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    notes TEXT,
    recorded_at DATETIME NOT NULL,
    recorded_by VARCHAR(10) DEFAULT 'patient' CHECK (recorded_by IN ('patient', 'doctor', 'system')),
    is_critical BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('patient', 'doctor')),
    recipient_type VARCHAR(10) NOT NULL CHECK (recipient_type IN ('patient', 'doctor')),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_urgent BOOLEAN DEFAULT 0,
    is_read BOOLEAN DEFAULT 0,
    parent_message_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- Care Plans table
CREATE TABLE care_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(15) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    goals TEXT,
    instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Care Plan Tasks table
CREATE TABLE care_plan_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    care_plan_id INTEGER NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(100), -- daily, weekly, monthly
    due_date DATE,
    is_completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (care_plan_id) REFERENCES care_plans(id) ON DELETE CASCADE
);

-- Medical Documents table
CREATE TABLE medical_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('lab_result', 'prescription', 'report', 'image', 'other')),
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

-- Medications table
CREATE TABLE medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    instructions TEXT,
    side_effects TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Medication Logs table
CREATE TABLE medication_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL,
    taken_at DATETIME NOT NULL,
    is_taken BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(15) NOT NULL CHECK (type IN ('appointment', 'medication', 'message', 'alert', 'reminder', 'system')),
    is_read BOOLEAN DEFAULT 0,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    action_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Password Reset Tokens table
CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Doctor Availability table
CREATE TABLE doctor_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Emergency Contacts table
CREATE TABLE emergency_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    relationship VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    is_primary BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_doctors_doctor_id ON doctors(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_health_records_patient ON health_records(patient_id);
CREATE INDEX idx_health_records_type ON health_records(record_type);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_care_plans_patient ON care_plans(patient_id);
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
`;

// Execute the schema
db.exec(createTables, (err) => {
    if (err) {
        console.error('Error creating tables:', err.message);
    } else {
        console.log('Database schema created successfully!');
        console.log('Tables created:');
        console.log('- users');
        console.log('- patients');
        console.log('- doctors');
        console.log('- appointments');
        console.log('- health_records');
        console.log('- messages');
        console.log('- care_plans');
        console.log('- care_plan_tasks');
        console.log('- medical_documents');
        console.log('- medications');
        console.log('- medication_logs');
        console.log('- notifications');
        console.log('- audit_logs');
        console.log('- password_reset_tokens');
        console.log('- doctor_availability');
        console.log('- emergency_contacts');
    }
    
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
    });
});