const express = require("express");
const moment = require("moment");

const database = require("../config/database");
const {
  authenticateToken,
  requirePatient,
  requireDoctorOrAdmin,
  getPatientInfo,
} = require("../middleware/auth");
const { validateProfileUpdate } = require("../middleware/validation");

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get patient dashboard data
router.get("/dashboard", requirePatient, getPatientInfo, async (req, res) => {
  try {
    const patientId = req.patient.id;

    // Get upcoming appointments
    const appointments = await database.legacyAll(
      `
            SELECT
                a.id, a.appointment_date, a.appointment_time, a.type, a.status, a.reason,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.specialization
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.patient_id = ? AND a.appointment_date >= CURRENT_DATE
            ORDER BY a.appointment_date, a.appointment_time
            LIMIT 5
        `,
      [patientId],
    );

    // Get recent health records
    const healthRecords = await database.legacyAll(
      `
            SELECT record_type, value, unit, recorded_at, notes
            FROM health_records
            WHERE patient_id = ?
            ORDER BY recorded_at DESC
            LIMIT 10
        `,
      [patientId],
    );

    // Get active medications
    const medications = await database.legacyAll(
      `
            SELECT
                m.medication_name, m.dosage, m.frequency, m.instructions,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM medications m
            JOIN doctors d ON m.doctor_id = d.id
            WHERE m.patient_id = ? AND m.is_active = ?
            ORDER BY m.created_at DESC
        `,
      [patientId, true],
    );

    // Get active care plans
    const carePlans = await database.legacyAll(
      `
            SELECT
                cp.id, cp.title, cp.description, cp.start_date, cp.end_date, cp.status, cp.goals,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM care_plans cp
            JOIN doctors d ON cp.doctor_id = d.id
            WHERE cp.patient_id = ? AND cp.status = ?
            ORDER BY cp.created_at DESC
        `,
      [patientId, "active"],
    );

    // Get care plan tasks for active care plans
    const carePlanTasks = await database.legacyAll(
      `
            SELECT
                cpt.id, cpt.care_plan_id, cpt.task_name, cpt.description,
                cpt.frequency, cpt.due_date, cpt.is_completed, cpt.completed_at
            FROM care_plan_tasks cpt
            JOIN care_plans cp ON cpt.care_plan_id = cp.id
            WHERE cp.patient_id = ? AND cp.status = ?
            ORDER BY cpt.due_date ASC, cpt.created_at DESC
        `,
      [patientId, "active"],
    );

    // Get recent notifications
    const notifications = await database.legacyAll(
      `
            SELECT id, title, message, type, priority, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        `,
      [req.user.id],
    );

    // Get unread message count
    const unreadMessages = await database.legacyGet(
      `
            SELECT COUNT(*) as count
            FROM messages
            WHERE recipient_id = ? AND is_read = ?
        `,
      [req.user.id, false],
    );

    res.json({
      success: true,
      data: {
        patient: req.patient,
        appointments,
        healthRecords,
        medications,
        carePlans,
        carePlanTasks,
        notifications,
        unreadMessageCount: unreadMessages.count,
      },
    });
  } catch (error) {
    console.error("Patient dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
    });
  }
});

// Get patient profile
router.get("/profile", async (req, res) => {
  try {
    // Get emergency contacts
    const emergencyContacts = await database.legacyAll(
      "SELECT * FROM emergency_contacts WHERE patient_id = ? ORDER BY is_primary DESC, created_at",
      [req.patient.id],
    );

    res.json({
      success: true,
      data: {
        patient: req.patient,
        emergencyContacts,
      },
    });
  } catch (error) {
    console.error("Get patient profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient profile",
    });
  }
});

// Update patient profile
router.put("/profile", validateProfileUpdate, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContactName,
      emergencyContactPhone,
      bloodType,
      allergies,
      medicalHistory,
    } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (firstName !== undefined) {
      updateFields.push("first_name = ?");
      updateValues.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push("last_name = ?");
      updateValues.push(lastName);
    }
    if (phone !== undefined) {
      updateFields.push("phone = ?");
      updateValues.push(phone);
    }
    if (dateOfBirth !== undefined) {
      updateFields.push("date_of_birth = ?");
      updateValues.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updateFields.push("gender = ?");
      updateValues.push(gender);
    }
    if (address !== undefined) {
      updateFields.push("address = ?");
      updateValues.push(address);
    }
    if (emergencyContactName !== undefined) {
      updateFields.push("emergency_contact_name = ?");
      updateValues.push(emergencyContactName);
    }
    if (emergencyContactPhone !== undefined) {
      updateFields.push("emergency_contact_phone = ?");
      updateValues.push(emergencyContactPhone);
    }
    if (bloodType !== undefined) {
      updateFields.push("blood_type = ?");
      updateValues.push(bloodType);
    }
    if (allergies !== undefined) {
      updateFields.push("allergies = ?");
      updateValues.push(allergies);
    }
    if (medicalHistory !== undefined) {
      updateFields.push("medical_history = ?");
      updateValues.push(medicalHistory);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(req.patient.id);

    await database.legacyRun(
      `UPDATE patients SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues,
    );

    // Log profile update
    await database.legacyRun(
      "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "UPDATE_PROFILE",
        "patients",
        req.patient.id,
        JSON.stringify(req.body),
      ],
    );

    // Get updated profile
    const updatedPatient = await database.legacyGet(
      "SELECT * FROM patients WHERE id = ?",
      [req.patient.id],
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { patient: updatedPatient },
    });
  } catch (error) {
    console.error("Update patient profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

// Get patient's appointments
router.get("/appointments", async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
            SELECT
                a.id, a.appointment_date, a.appointment_time, a.duration, a.type, a.status,
                a.reason, a.notes, a.diagnosis, a.prescription, a.created_at,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name,
                d.specialization, d.department
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.patient_id = ?
        `;

    const queryParams = [req.patient.id];

    if (status) {
      query += " AND a.status = ?";
      queryParams.push(status);
    }

    query +=
      " ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt(offset));

    const appointments = await database.legacyAll(query, queryParams);

    res.json({
      success: true,
      data: { appointments },
    });
  } catch (error) {
    console.error("Get patient appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appointments",
    });
  }
});

// Get patient's health records
router.get("/health-records", async (req, res) => {
  try {
    const {
      recordType,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
            SELECT id, record_type, value, unit, notes, recorded_at, recorded_by, is_critical, created_at
            FROM health_records
            WHERE patient_id = ?
        `;

    const queryParams = [req.patient.id];

    if (recordType) {
      query += " AND record_type = ?";
      queryParams.push(recordType);
    }

    if (startDate) {
      query += " AND recorded_at >= ?";
      queryParams.push(startDate);
    }

    if (endDate) {
      query += " AND recorded_at <= ?";
      queryParams.push(endDate);
    }

    query += " ORDER BY recorded_at DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt(offset));

    const healthRecords = await database.legacyAll(query, queryParams);

    res.json({
      success: true,
      data: { healthRecords },
    });
  } catch (error) {
    console.error("Get patient health records error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get health records",
    });
  }
});

// Get patient's medications
router.get("/medications", async (req, res) => {
  try {
    const { isActive = true } = req.query;

    const medications = await database.legacyAll(
      `
            SELECT
                m.id, m.medication_name, m.dosage, m.frequency, m.start_date, m.end_date,
                m.instructions, m.side_effects, m.is_active, m.created_at,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name,
                d.specialization
            FROM medications m
            JOIN doctors d ON m.doctor_id = d.id
            WHERE m.patient_id = ? AND m.is_active = ?
            ORDER BY m.created_at DESC
        `,
      [req.patient.id, isActive === "true"],
    );

    res.json({
      success: true,
      data: { medications },
    });
  } catch (error) {
    console.error("Get patient medications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get medications",
    });
  }
});

// Get patient's care plans
router.get("/care-plans", async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
            SELECT
                cp.id, cp.title, cp.description, cp.start_date, cp.end_date,
                cp.status, cp.goals, cp.instructions, cp.created_at,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name,
                d.specialization
            FROM care_plans cp
            JOIN doctors d ON cp.doctor_id = d.id
            WHERE cp.patient_id = ?
        `;

    const queryParams = [req.patient.id];

    if (status) {
      query += " AND cp.status = ?";
      queryParams.push(status);
    }

    query += " ORDER BY cp.created_at DESC";

    const carePlans = await database.legacyAll(query, queryParams);

    // Get tasks for each care plan
    for (let plan of carePlans) {
      const tasks = await database.legacyAll(
        `
                SELECT id, task_name, description, frequency, due_date, is_completed, completed_at, notes
                FROM care_plan_tasks
                WHERE care_plan_id = ?
                ORDER BY due_date ASC, created_at DESC
            `,
        [plan.id],
      );
      plan.tasks = tasks;
    }

    res.json({
      success: true,
      data: { carePlans },
    });
  } catch (error) {
    console.error("Get patient care plans error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get care plans",
    });
  }
});

// Get patient's medical documents
router.get("/documents", async (req, res) => {
  try {
    const { documentType, limit = 20, offset = 0 } = req.query;

    let query = `
            SELECT
                md.id, md.document_type, md.title, md.file_name, md.file_size,
                md.description, md.upload_date,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM medical_documents md
            LEFT JOIN doctors d ON md.doctor_id = d.id
            WHERE md.patient_id = ?
        `;

    const queryParams = [req.patient.id];

    if (documentType) {
      query += " AND md.document_type = ?";
      queryParams.push(documentType);
    }

    query += " ORDER BY md.upload_date DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt(offset));

    const documents = await database.legacyAll(query, queryParams);

    res.json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    console.error("Get patient documents error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get documents",
    });
  }
});

// Search patient records by patient ID (for doctors)
router.get("/search", requireDoctorOrAdmin, async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    // Get patient basic information
    const patient = await database.legacyGet(
      `
            SELECT id, first_name, last_name, date_of_birth, gender, blood_type, allergies, medical_history
            FROM patients
            WHERE id = ?
        `,
      [patientId],
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Calculate age
    const age = patient.date_of_birth
      ? moment().diff(moment(patient.date_of_birth), "years")
      : null;

    // Get lab results (health records with specific types)
    const labResults = await database.legacyAll(
      `
            SELECT record_type as test, value as result, unit, recorded_at as date, notes
            FROM health_records
            WHERE patient_id = ? AND record_type IN ('blood_sugar', 'blood_pressure', 'lab_result')
            ORDER BY recorded_at DESC
            LIMIT 10
        `,
      [patientId],
    );

    // Format lab results with reference ranges and status
    const formattedLabResults = labResults.map((result) => {
      let reference = "";
      let status = "Normal";

      switch (result.test) {
        case "HbA1c":
          reference = "4.0-5.6%";
          status = parseFloat(result.result) > 5.6 ? "High" : "Normal";
          break;
        case "Fasting Glucose":
          reference = "70-100 mg/dL";
          status = parseFloat(result.result) > 100 ? "High" : "Normal";
          break;
        case "Cholesterol":
          reference = "<200 mg/dL";
          status = parseFloat(result.result) >= 200 ? "High" : "Normal";
          break;
        case "Blood Pressure":
          reference = "<120/80 mmHg";
          const [systolic, diastolic] = result.result
            .split("/")
            .map((v) => parseInt(v));
          status = systolic >= 120 || diastolic >= 80 ? "High" : "Normal";
          break;
        case "Creatinine":
          reference = "0.7-1.3 mg/dL";
          const creatinine = parseFloat(result.result);
          status = creatinine < 0.7 || creatinine > 1.3 ? "Abnormal" : "Normal";
          break;
        case "eGFR":
          reference = ">90 mL/min";
          status = parseFloat(result.result) < 90 ? "Low" : "Normal";
          break;
        case "Spirometry":
          reference = ">80%";
          status =
            parseFloat(result.result.replace("%", "")) < 80 ? "Low" : "Normal";
          break;
        case "Peak Flow":
          reference = "380-450 L/min";
          const peakFlow = parseFloat(result.result);
          status = peakFlow < 380 || peakFlow > 450 ? "Abnormal" : "Normal";
          break;
        case "Allergy Panel":
          reference = "Negative";
          status = result.result.toLowerCase().includes("positive")
            ? "Positive"
            : "Negative";
          break;
        default:
          reference = "N/A";
          status = "Normal";
      }

      return {
        date: moment(result.date).format("YYYY-MM-DD"),
        test: result.test,
        result: result.result + (result.unit ? " " + result.unit : ""),
        reference,
        status,
      };
    });

    // Get current medications
    const medications = await database.legacyAll(
      `
            SELECT medication_name as name, dosage, frequency, start_date, is_active
            FROM medications
            WHERE patient_id = ? AND is_active = ?
            ORDER BY start_date DESC
        `,
      [patientId, true],
    );

    const formattedMedications = medications.map((med) => ({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      startDate: moment(med.start_date).format("YYYY-MM-DD"),
      status: "Active",
    }));

    // Get medical history from patient record
    const medicalHistory = patient.medical_history
      ? patient.medical_history.split("\n").filter((item) => item.trim())
      : [];

    res.json({
      success: true,
      data: {
        patientId,
        name: `${patient.first_name} ${patient.last_name}`,
        age: age ? age.toString() : "-",
        bloodType: patient.blood_type || "-",
        labResults: formattedLabResults,
        medications: formattedMedications,
        medicalHistory,
      },
    });
  } catch (error) {
    console.error("Search patient records error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search patient records",
    });
  }
});

module.exports = router;
