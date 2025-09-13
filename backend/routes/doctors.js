const express = require("express");
const bcrypt = require("bcryptjs");
const database = require("../config/database");
const {
  authenticateToken,
  requireDoctor,
  getDoctorInfo,
} = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Generate Patient ID
const generatePatientID = () => {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const randomNum = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `PAT-${currentYear}-${randomNum}`;
};

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireDoctor);
router.use(getDoctorInfo);

// Add POST /patients route for doctors to create patients
router.post("/patients", async (req, res) => {
  try {
    const doctorId = req.doctor.id;
    const { email, firstName, lastName, phone, dateOfBirth, gender, address } =
      req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Email, firstName, and lastName are required",
      });
    }

    // Check if user with email already exists
    const existingUser = await database.legacyGet(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user with default password and role 'patient'
    const defaultPassword = "defaultPassword123"; // Consider generating a secure random password or sending invite email
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    const userResult = await database.legacyRun(
      "INSERT INTO users (email, password_hash, role, is_active, email_verified) VALUES (?, ?, ?, ?, ?)",
      [email, passwordHash, "patient", true, true],
    );

    const userId = userResult.id;

    // Generate patient ID
    const patientId = generatePatientID();

    // Create patient profile
    const patientResult = await database.legacyRun(
      `INSERT INTO patients (user_id, patient_id, first_name, last_name, phone, date_of_birth, gender, address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        patientId,
        firstName,
        lastName,
        phone || null,
        dateOfBirth || null,
        gender || null,
        address || null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      data: {
        patientId,
        userId,
        patientProfileId: patientResult.id,
      },
    });
  } catch (error) {
    console.error("Create patient error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create patient",
    });
  }
});

// Get doctor dashboard data
router.get("/dashboard", async (req, res) => {
  try {
    const doctorId = req.doctor.id;

    // Get today's appointments
    const todayAppointments = await database.legacyAll(
      `
            SELECT
                a.id, a.appointment_time, a.type, a.reason, a.status,
                p.first_name, p.last_name, p.patient_id
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ? AND a.appointment_date = CURRENT_DATE
            ORDER BY a.appointment_time
        `,
      [doctorId],
    );

    // Get total patients count
    const totalPatients = await database.legacyGet(
      `
            SELECT COUNT(DISTINCT a.patient_id) as count
            FROM appointments a
            WHERE a.doctor_id = ?
        `,
      [doctorId],
    );

    // Get pending appointments count
    // Get pending appointments list
    const pendingAppointmentsList = await database.legacyAll(
      `
            SELECT
                a.id, a.appointment_date, a.appointment_time, a.type, a.reason, a.status,
                p.first_name, p.last_name, p.patient_id
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ? AND a.status = 'pending'
            ORDER BY a.appointment_date, a.appointment_time
            LIMIT 10
        `,
      [doctorId],
    );

    const pendingAppointmentsCount = await database.legacyGet(
      `
            SELECT COUNT(*) as count
            FROM appointments
            WHERE doctor_id = ? AND status = 'pending'
        `,
      [doctorId],
    );

    // Get recent messages
    const recentMessages = await database.legacyAll(
      `
            SELECT
                m.id, m.subject, m.message, m.is_urgent, m.is_read, m.created_at,
                u.email, p.first_name, p.last_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN patients p ON u.id = p.user_id
            WHERE m.recipient_id = ? AND m.recipient_type = 'doctor'
            ORDER BY m.created_at DESC
            LIMIT 5
        `,
      [req.user.id],
    );

    res.json({
      success: true,
      data: {
        doctor: req.doctor,
        todayAppointments,
        totalPatients: totalPatients.count,
        pendingAppointments: pendingAppointmentsCount.count,
        pendingAppointmentsList,
        recentMessages,
      },
    });
  } catch (error) {
    console.error("Doctor dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
    });
  }
});

// Get doctor profile
router.get("/profile", async (req, res) => {
  try {
    res.json({
      success: true,
      data: { doctor: req.doctor },
    });
  } catch (error) {
    console.error("Get doctor profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctor profile",
    });
  }
});

// Get doctor's patients with optional search
router.get("/patients", async (req, res) => {
  try {
    const searchTermRaw = req.query.search ? req.query.search.trim() : null;
    const doctorId = req.doctor.id;

    let query = `
            SELECT DISTINCT
                p.id, p.patient_id, p.first_name, p.last_name, p.phone,
                p.date_of_birth, p.gender, p.blood_type,
                MAX(a.appointment_date) as last_appointment
            FROM patients p
            JOIN appointments a ON p.id = a.patient_id
            WHERE a.doctor_id = ?
        `;
    const params = [doctorId];

    if (searchTermRaw) {
      const searchTermLower = searchTermRaw.toLowerCase();

      // Check if searchTermRaw looks like a patient ID (assuming patient IDs start with 'PAT' or similar)
      const isPatientId = /^PAT/i.test(searchTermRaw);

      if (isPatientId) {
        // Exact match on patient_id (case insensitive)
        query += ` AND LOWER(p.patient_id) = ?`;
        params.push(searchTermLower);
      } else if (searchTermRaw.includes(" ")) {
        // Treat as full name: split into first and last name
        const nameParts = searchTermRaw.split(" ").filter(Boolean);
        if (nameParts.length >= 2) {
          const firstName = nameParts[0].toLowerCase();
          const lastName = nameParts.slice(1).join(" ").toLowerCase();
          query += ` AND LOWER(p.first_name) = ? AND LOWER(p.last_name) = ?`;
          params.push(firstName, lastName);
        } else {
          // If only one part after split, fallback to partial match on first or last name
          query += ` AND (LOWER(p.first_name) = ? OR LOWER(p.last_name) = ?)`;
          params.push(searchTermLower, searchTermLower);
        }
      } else {
        // Single name search: exact match on first_name or last_name
        query += ` AND (LOWER(p.first_name) = ? OR LOWER(p.last_name) = ?)`;
        params.push(searchTermLower, searchTermLower);
      }
    }

    query += `
            GROUP BY p.id
            ORDER BY p.last_name, p.first_name
        `;

    const patients = await database.legacyAll(query, params);

    res.json({
      success: true,
      data: { patients },
    });
  } catch (error) {
    console.error("Get doctor patients error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patients",
    });
  }
});

// Get specific patient details for doctor
router.get("/patients/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.doctor.id;

    // First check if the doctor has access to this patient (has had appointments)
    const accessCheck = await database.legacyGet(
      `
            SELECT COUNT(*) as count
            FROM appointments
            WHERE doctor_id = ? AND patient_id = (SELECT id FROM patients WHERE patient_id = ?)
        `,
      [doctorId, patientId],
    );

    if (accessCheck.count === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Patient not associated with this doctor",
      });
    }

    // Get patient details
    const patient = await database.legacyGet(
      `
            SELECT
                p.id, p.patient_id, p.first_name, p.last_name, p.email, p.phone,
                p.date_of_birth, p.gender, p.address, p.blood_type, p.allergies, p.medical_history,
                p.created_at, p.updated_at
            FROM patients p
            WHERE p.patient_id = ?
        `,
      [patientId],
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: { patient },
    });
  } catch (error) {
    console.error("Get doctor patient details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient details",
    });
  }
});

module.exports = router;
