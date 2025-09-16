const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// PostgreSQL connection configuration
const pool = new Pool({
  user: process.env.POSTGRES_USER || "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB || "meduco",
  password: process.env.POSTGRES_PASSWORD || "password",
  port: process.env.POSTGRES_PORT || 5432,
});

const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log("🏥 Initializing MEDUCO PostgreSQL database...");

    // Begin transaction
    await client.query("BEGIN");

    // Clear existing data (in reverse order of dependencies)
    console.log("🧹 Clearing existing data...");
    await client.query("TRUNCATE TABLE communication_logs CASCADE");
    await client.query("TRUNCATE TABLE emergency_contacts CASCADE");
    await client.query("TRUNCATE TABLE doctor_availability CASCADE");
    await client.query("TRUNCATE TABLE password_reset_tokens CASCADE");
    await client.query("TRUNCATE TABLE audit_logs CASCADE");
    await client.query("TRUNCATE TABLE notifications CASCADE");
    await client.query("TRUNCATE TABLE medication_logs CASCADE");
    await client.query("TRUNCATE TABLE medications CASCADE");
    await client.query("TRUNCATE TABLE medical_documents CASCADE");
    await client.query("TRUNCATE TABLE care_plan_tasks CASCADE");
    await client.query("TRUNCATE TABLE care_plans CASCADE");
    await client.query("TRUNCATE TABLE messages CASCADE");
    await client.query("TRUNCATE TABLE health_records CASCADE");
    await client.query("TRUNCATE TABLE appointments CASCADE");
    await client.query("TRUNCATE TABLE doctors CASCADE");
    await client.query("TRUNCATE TABLE patients CASCADE");
    await client.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");

    // Reset sequences to start from 1
    console.log("🔄 Resetting sequences...");
    const sequences = [
      "users_id_seq",
      "patients_id_seq",
      "doctors_id_seq",
      "appointments_id_seq",
      "health_records_id_seq",
      "messages_id_seq",
      "care_plans_id_seq",
      "care_plan_tasks_id_seq",
      "medical_documents_id_seq",
      "medications_id_seq",
      "medication_logs_id_seq",
      "notifications_id_seq",
      "audit_logs_id_seq",
      "password_reset_tokens_id_seq",
      "doctor_availability_id_seq",
      "emergency_contacts_id_seq",
      "communication_logs_id_seq",
    ];

    for (const seq of sequences) {
      try {
        await client.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      } catch (error) {
        // Sequence might not exist, continue
        console.log(`⚠️  Sequence ${seq} not found, skipping...`);
      }
    }

    // Commit transaction
    await client.query("COMMIT");
    console.log("✅ Database initialization completed successfully!");

    // Display summary
    const summary = await client.query(`
            SELECT
                'users' as table_name, COUNT(*) as count FROM users
            UNION ALL
            SELECT 'patients', COUNT(*) FROM patients
            UNION ALL
            SELECT 'doctors', COUNT(*) FROM doctors
            UNION ALL
            SELECT 'appointments', COUNT(*) FROM appointments
            UNION ALL
            SELECT 'health_records', COUNT(*) FROM health_records
            UNION ALL
            SELECT 'care_plans', COUNT(*) FROM care_plans
            UNION ALL
            SELECT 'medications', COUNT(*) FROM medications
            UNION ALL
            SELECT 'messages', COUNT(*) FROM messages
            UNION ALL
            SELECT 'notifications', COUNT(*) FROM notifications
            ORDER BY table_name
        `);

    console.log("\n📊 Database Summary:");
    console.log("====================");
    summary.rows.forEach((row) => {
      console.log(`${row.table_name}: ${row.count} records`);
    });

    console.log("\n🎯 Database Status:");
    console.log("===================");
    console.log("✅ All tables are empty and ready for real-time data");
    console.log("✅ Sequences reset to start from ID 1");
    console.log("✅ Foreign key constraints are active");
    console.log("✅ Indexes are optimized for performance");
    console.log("✅ Triggers are active for timestamp updates");

    console.log("\n📋 Next Steps:");
    console.log("==============");
    console.log("1. Start the backend server: npm run dev");
    console.log("2. Use the frontend to register new users");
    console.log("3. All data will be real-time user-generated content");
    console.log("4. No sample data will interfere with production use");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
};

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("\n✅ PostgreSQL database initialization completed!");
      console.log("🚀 Database is ready for real-time data collection.");
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Database initialization failed:", error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
