const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// SQLite connection
const sqliteDbPath = path.join(__dirname, 'meduco.db');
const sqliteDb = new sqlite3.Database(sqliteDbPath);

// PostgreSQL connection
const pgPool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'meduco',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: process.env.POSTGRES_PORT || 5432,
});

// Helper function to promisify SQLite queries
const sqliteQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        if (query.toLowerCase().startsWith('select')) {
            sqliteDb.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        } else {
            sqliteDb.run(query, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        }
    });
};

// Convert SQLite boolean values to PostgreSQL
const convertBoolean = (value) => {
    if (value === 1 || value === '1' || value === true) return true;
    if (value === 0 || value === '0' || value === false) return false;
    return value;
};

// Convert SQLite datetime to PostgreSQL timestamp
const convertDateTime = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && value.includes('T')) {
        return value; // Already ISO format
    }
    return new Date(value).toISOString();
};

// Table migration configurations
const tableMigrations = {
    users: {
        query: 'SELECT * FROM users ORDER BY id',
        insertQuery: `
            INSERT INTO users (id, email, password_hash, role, is_active, email_verified, last_login, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        transform: (row) => [
            row.id,
            row.email,
            row.password_hash,
            row.role,
            convertBoolean(row.is_active),
            convertBoolean(row.email_verified),
            convertDateTime(row.last_login),
            convertDateTime(row.created_at),
            convertDateTime(row.updated_at)
        ]
    },
    patients: {
        query: 'SELECT * FROM patients ORDER BY id',
        insertQuery: `
            INSERT INTO patients (id, user_id, patient_id, first_name, last_name, date_of_birth, gender, phone, address,
                                emergency_contact_name, emergency_contact_phone, blood_type, allergies, medical_history,
                                insurance_info, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `,
        transform: (row) => [
            row.id,
            row.user_id,
            row.patient_id,
            row.first_name,
            row.last_name,
            row.date_of_birth,
            row.gender,
            row.phone,
            row.address,
            row.emergency_contact_name,
            row.emergency_contact_phone,
            row.blood_type,
            row.allergies,
            row.medical_history,
            row.insurance_info,
            convertDateTime(row.created_at),
            convertDateTime(row.updated_at)
        ]
    },
    doctors: {
        query: 'SELECT * FROM doctors ORDER BY id',
        insertQuery: `
            INSERT INTO doctors (id, user_id, doctor_id, first_name, last_name, specialization, license_number, phone,
                               department, years_experience, education, certifications, bio, consultation_fee,
                               is_available, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `,
        transform: (row) => [
            row.id,
            row.user_id,
            row.doctor_id,
            row.first_name,
            row.last_name,
            row.specialization,
            row.license_number,
            row.phone,
            row.department,
            row.years_experience,
            row.education,
            row.certifications,
            row.bio,
            row.consultation_fee,
            convertBoolean(row.is_available),
            convertDateTime(row.created_at),
            convertDateTime(row.updated_at)
        ]
    },
    appointments: {
        query: 'SELECT * FROM appointments ORDER BY id',
        insertQuery: `
            INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, appointment_time, duration, type,
                                    status, reason, notes, diagnosis, prescription, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `,
        transform: (row) => [
            row.id,
            row.patient_id,
            row.doctor_id,
            row.appointment_date,
            row.appointment_time,
            row.duration,
            row.type,
            row.status,
            row.reason,
            row.notes,
            row.diagnosis,
            row.prescription,
            convertDateTime(row.created_at),
            convertDateTime(row.updated_at)
        ]
    },
    health_records: {
        query: 'SELECT * FROM health_records ORDER BY id',
        insertQuery: `
            INSERT INTO health_records (id, patient_id, record_type, value, unit, notes, recorded_at, recorded_by,
                                      is_critical, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        transform: (row) => [
            row.id,
            row.patient_id,
            row.record_type,
            row.value,
            row.unit,
            row.notes,
            convertDateTime(row.recorded_at),
            row.recorded_by,
            convertBoolean(row.is_critical),
            convertDateTime(row.created_at)
        ]
    },
    messages: {
        query: 'SELECT * FROM messages ORDER BY id',
        insertQuery: `
            INSERT INTO messages (id, sender_id, recipient_id, sender_type, recipient_type, subject, message,
                                is_urgent, is_read, parent_message_id, created_at, read_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        transform: (row) => [
            row.id,
            row.sender_id,
            row.recipient_id,
            row.sender_type,
            row.recipient_type,
            row.subject,
            row.message,
            convertBoolean(row.is_urgent),
            convertBoolean(row.is_read),
            row.parent_message_id,
            convertDateTime(row.created_at),
            convertDateTime(row.read_at)
        ]
    },
    care_plans: {
        query: 'SELECT * FROM care_plans ORDER BY id',
        insertQuery: `
            INSERT INTO care_plans (id, patient_id, doctor_id, title, description, start_date, end_date, status,
                                  goals, instructions, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        transform: (row) => [
            row.id,
            row.patient_id,
            row.doctor_id,
            row.title,
            row.description,
            row.start_date,
            row.end_date,
            row.status,
            row.goals,
            row.instructions,
            convertDateTime(row.created_at),
            convertDateTime(row.updated_at)
        ]
    },
    care_plan_tasks: {
        query: 'SELECT * FROM care_plan_tasks ORDER BY id',
        insertQuery: `
            INSERT INTO care_plan_tasks (id, care_plan_id, task_name, description, frequency, due_date,
                                       is_completed, completed_at, notes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        transform: (row) => [
            row.id,
            row.care_plan_id,
            row.task_name,
            row.description,
            row.frequency,
            row.due_date,
            convertBoolean(row.is_completed),
            convertDateTime(row.completed_at),
            row.notes,
            convertDateTime(row.created_at)
        ]
    },
    medical_documents: {
        query: 'SELECT * FROM medical_documents ORDER BY id',
        insertQuery: `
            INSERT INTO medical_documents (id, patient_id, doctor_id, document_type, title, file_name, file_path,
                                         file_size, mime_type, description, upload_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        transform: (row) => [
            row.id,
            row.patient_id,
            row.doctor_id,
            row.document_type,
            row.title,
            row.file_name,
            row.file_path,
            row.file_size,
            row.mime_type,
            row.description,
            convertDateTime(row.upload_date)
        ]
    },
    medications: {
        query: 'SELECT * FROM medications ORDER BY id',
        insertQuery: `
            INSERT INTO medications (id, patient_id, doctor_id, medication_name, dosage, frequency, start_date,
                                   end_date, instructions, side_effects, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        transform: (row) => [
            row.id,
            row.patient_id,
            row.doctor_id,
            row.medication_name,
            row.dosage,
            row.frequency,
            row.start_date,
            row.end_date,
            row.instructions,
            row.side_effects,
            convertBoolean(row.is_active),
            convertDateTime(row.created_at),
            convertDateTime(row.updated_at)
        ]
    },
    medication_logs: {
        query: 'SELECT * FROM medication_logs ORDER BY id',
        insertQuery: `
            INSERT INTO medication_logs (id, medication_id, taken_at, is_taken, notes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `,
        transform: (row) => [
            row.id,
            row.medication_id,
            convertDateTime(row.taken_at),
            convertBoolean(row.is_taken),
            row.notes,
            convertDateTime(row.created_at)
        ]
    },
    notifications: {
        query: 'SELECT * FROM notifications ORDER BY id',
        insertQuery: `
            INSERT INTO notifications (id, user_id, title, message, type, is_read, priority, action_url,
                                     created_at, read_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        transform: (row) => [
            row.id,
            row.user_id,
            row.title,
            row.message,
            row.type,
            convertBoolean(row.is_read),
            row.priority,
            row.action_url,
            convertDateTime(row.created_at),
            convertDateTime(row.read_at)
        ]
    },
    audit_logs: {
        query: 'SELECT * FROM audit_logs ORDER BY id',
        insertQuery: `
            INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values,
                                  ip_address, user_agent, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        transform: (row) => [
            row.id,
            row.user_id,
            row.action,
            row.table_name,
            row.record_id,
            row.old_values ? JSON.parse(row.old_values) : null,
            row.new_values ? JSON.parse(row.new_values) : null,
            row.ip_address,
            row.user_agent,
            convertDateTime(row.created_at)
        ]
    },
    password_reset_tokens: {
        query: 'SELECT * FROM password_reset_tokens ORDER BY id',
        insertQuery: `
            INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `,
        transform: (row) => [
            row.id,
            row.user_id,
            row.token,
            convertDateTime(row.expires_at),
            convertBoolean(row.used),
            convertDateTime(row.created_at)
        ]
    },
    doctor_availability: {
        query: 'SELECT * FROM doctor_availability ORDER BY id',
        insertQuery: `
            INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, is_available,
                                           created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        transform: (row) => [
            row.id,
            row.doctor_id,
            row.day_of_week,
            row.start_time,
            row.end_time,
            convertBoolean(row.is_available),
            convertDateTime(row.created_at),
            convertDateTime(row.updated_at)
        ]
    },
    emergency_contacts: {
        query: 'SELECT * FROM emergency_contacts ORDER BY id',
        insertQuery: `
            INSERT INTO emergency_contacts (id, patient_id, name, relationship, phone, email, address,
                                          is_primary, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        transform: (row) => [
            row.id,
            row.patient_id,
            row.name,
            row.relationship,
            row.phone,
            row.email,
            row.address,
            convertBoolean(row.is_primary),
            convertDateTime(row.created_at)
        ]
    },
    communication_logs: {
        query: 'SELECT * FROM communication_logs ORDER BY id',
        insertQuery: `
            INSERT INTO communication_logs (id, type, recipient, content, status, external_id, error_message, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        transform: (row) => [
            row.id,
            row.type,
            row.recipient,
            row.content,
            row.status,
            row.external_id,
            row.error_message,
            convertDateTime(row.created_at)
        ]
    }
};

const migrateTable = async (tableName, config, pgClient) => {
    try {
        console.log(`📊 Migrating table: ${tableName}`);

        // Get data from SQLite
        const sqliteData = await sqliteQuery(config.query);

        if (sqliteData.length === 0) {
            console.log(`   ⚠️  No data found in ${tableName}`);
            return 0;
        }

        // Clear existing PostgreSQL data
        await pgClient.query(`TRUNCATE TABLE ${tableName} CASCADE`);

        // Insert data into PostgreSQL
        let insertedCount = 0;
        for (const row of sqliteData) {
            try {
                const transformedData = config.transform(row);
                await pgClient.query(config.insertQuery, transformedData);
                insertedCount++;
            } catch (error) {
                console.error(`   ❌ Error inserting row ${row.id} in ${tableName}:`, error.message);
            }
        }

        // Update sequence for tables with SERIAL primary keys
        if (sqliteData.length > 0 && tableName !== 'audit_logs') {
            const maxId = Math.max(...sqliteData.map(row => row.id));
            await pgClient.query(`SELECT setval('${tableName}_id_seq', $1, true)`, [maxId]);
        }

        console.log(`   ✅ Migrated ${insertedCount}/${sqliteData.length} records`);
        return insertedCount;

    } catch (error) {
        console.error(`   ❌ Error migrating ${tableName}:`, error.message);
        throw error;
    }
};

const migrateDatabase = async () => {
    const pgClient = await pgPool.connect();

    try {
        console.log('🚀 Starting SQLite to PostgreSQL migration...');

        // Check SQLite database exists
        try {
            await sqliteQuery('SELECT COUNT(*) FROM users');
        } catch (error) {
            throw new Error('SQLite database not found or not accessible');
        }

        // Test PostgreSQL connection
        await pgClient.query('SELECT NOW()');
        console.log('✅ Connected to both databases');

        // Begin transaction
        await pgClient.query('BEGIN');

        // Migration order (respecting foreign key constraints)
        const migrationOrder = [
            'users',
            'patients',
            'doctors',
            'doctor_availability',
            'appointments',
            'health_records',
            'messages',
            'care_plans',
            'care_plan_tasks',
            'medical_documents',
            'medications',
            'medication_logs',
            'notifications',
            'audit_logs',
            'password_reset_tokens',
            'emergency_contacts',
            'communication_logs'
        ];

        let totalMigrated = 0;

        for (const tableName of migrationOrder) {
            if (tableMigrations[tableName]) {
                const count = await migrateTable(tableName, tableMigrations[tableName], pgClient);
                totalMigrated += count;
            } else {
                console.log(`⚠️  No migration config found for table: ${tableName}`);
            }
        }

        // Commit transaction
        await pgClient.query('COMMIT');

        console.log(`\n🎉 Migration completed successfully!`);
        console.log(`📊 Total records migrated: ${totalMigrated}`);

        // Verify migration
        console.log('\n🔍 Verification Summary:');
        console.log('========================');

        for (const tableName of migrationOrder.slice(0, 10)) { // Check first 10 tables
            try {
                const pgCount = await pgClient.query(`SELECT COUNT(*) FROM ${tableName}`);
                const sqliteCount = await sqliteQuery(`SELECT COUNT(*) FROM ${tableName}`);

                const pgTotal = parseInt(pgCount.rows[0].count);
                const sqliteTotal = sqliteCount[0]['COUNT(*)'];

                const status = pgTotal === sqliteTotal ? '✅' : '❌';
                console.log(`${status} ${tableName}: SQLite=${sqliteTotal}, PostgreSQL=${pgTotal}`);
            } catch (error) {
                console.log(`❓ ${tableName}: Unable to verify (${error.message})`);
            }
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        await pgClient.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        pgClient.release();
    }
};

// Cleanup function
const cleanup = () => {
    if (sqliteDb) {
        sqliteDb.close();
    }
    if (pgPool) {
        pgPool.end();
    }
};

// Run migration if this file is executed directly
if (require.main === module) {
    migrateDatabase()
        .then(() => {
            console.log('\n🎊 Database migration completed successfully!');
            console.log('Your SQLite data has been successfully migrated to PostgreSQL.');
            cleanup();
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Database migration failed:', error.message);
            cleanup();
            process.exit(1);
        });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Migration interrupted by user');
    cleanup();
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Migration terminated');
    cleanup();
    process.exit(1);
});

module.exports = { migrateDatabase, cleanup };
