const express = require("express");
const database = require("../config/database");
const {
  authenticateToken,
  getPatientInfo,
  getDoctorInfo,
} = require("../middleware/auth");
const { validateAppointment } = require("../middleware/validation");

const router = express.Router();

// Public routes (no authentication required)
router.get("/doctors", async (req, res) => {
  try {
    const doctors = await database.legacyAll(`
            SELECT id, first_name, last_name, specialization, department, phone, years_experience, consultation_fee
            FROM doctors
            ORDER BY last_name, first_name
        `);

    res.json({
      success: true,
      data: { doctors },
    });
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctors",
    });
  }
});

// Get available slots for a doctor on a specific date (public route)
router.get("/doctors/:id/slots", async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date parameter is required",
      });
    }

    // Check if doctor exists
    const doctor = await database.legacyGet(
      "SELECT id FROM doctors WHERE id = ?",
      [doctorId],
    );
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get day of week (0=Sunday, 1=Monday, etc.)
    const dayOfWeek = new Date(date).getDay();

    // Get doctor's availability for this day
    const availability = await database.legacyAll(
      `
            SELECT start_time, end_time
            FROM doctor_availability
            WHERE doctor_id = ? AND day_of_week = ?
        `,
      [doctorId, dayOfWeek],
    );

    if (availability.length === 0) {
      return res.json({
        success: true,
        data: { slots: [] },
      });
    }

    // Get existing appointments for this doctor on this date
    const existingAppointments = await database.legacyAll(
      `
            SELECT appointment_time, duration
            FROM appointments
            WHERE doctor_id = ? AND appointment_date = ?
        `,
      [doctorId, date],
    );

    // Calculate available slots (30-minute intervals)
    const slots = [];
    availability.forEach((av) => {
      const start = new Date(`1970-01-01T${av.start_time}`);
      const end = new Date(`1970-01-01T${av.end_time}`);
      const slotDuration = 30 * 60 * 1000; // 30 minutes in ms

      for (
        let time = start.getTime();
        time < end.getTime();
        time += slotDuration
      ) {
        const slotTime = new Date(time).toTimeString().slice(0, 5); // HH:MM
        const slotEnd = new Date(time + slotDuration)
          .toTimeString()
          .slice(0, 5);

        // Check if this slot conflicts with existing appointments
        const conflict = existingAppointments.some((app) => {
          const appTime = app.appointment_time;
          const appEnd = new Date(`1970-01-01T${appTime}`);
          appEnd.setMinutes(appEnd.getMinutes() + (app.duration || 30)); // assume 30 min if not set
          const appEndTime = appEnd.toTimeString().slice(0, 5);

          return !(slotEnd <= appTime || slotTime >= appEndTime);
        });

        if (!conflict) {
          slots.push(slotTime);
        }
      }
    });

    res.json({
      success: true,
      data: { slots },
    });
  } catch (error) {
    console.error("Get doctor slots error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctor slots",
    });
  }
});

// Apply authentication middleware to all routes below
router.use(authenticateToken);

// Get doctor availability (requires authentication)
router.get("/doctors/:id/availability", async (req, res) => {
  try {
    const doctorId = req.params.id;

    // Check if doctor exists
    const doctor = await database.legacyGet(
      "SELECT id FROM doctors WHERE id = ?",
      [doctorId],
    );
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const availability = await database.legacyAll(
      `
            SELECT day_of_week, start_time, end_time
            FROM doctor_availability
            WHERE doctor_id = ?
            ORDER BY day_of_week
        `,
      [doctorId],
    );

    res.json({
      success: true,
      data: { availability },
    });
  } catch (error) {
    console.error("Get doctor availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctor availability",
    });
  }
});

// Get appointments
router.get("/", async (req, res) => {
  try {
    const { status, date, limit = 20, offset = 0 } = req.query;

    let query = `
            SELECT
                a.id, a.appointment_date, a.appointment_time, a.duration, a.type, a.status,
                a.reason, a.notes, a.diagnosis, a.prescription, a.created_at,
                p.first_name as patient_first_name, p.last_name as patient_last_name, p.patient_id,
                d.id as doctor_id, d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.specialization
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE 1=1
        `;

    const queryParams = [];

    // Filter by user role
    if (req.user.role === "patient") {
      query += " AND p.user_id = ?";
      queryParams.push(req.user.id);
    } else if (req.user.role === "doctor") {
      query += " AND d.user_id = ?";
      queryParams.push(req.user.id);
    }

    if (status) {
      query += " AND a.status = ?";
      queryParams.push(status);
    }

    if (date) {
      query += " AND a.appointment_date = ?";
      queryParams.push(date);
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
    console.error("Get appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appointments",
    });
  }
});

// Create new appointment (patients and doctors)
router.post("/", validateAppointment, async (req, res) => {
  try {
    let patientId, doctorId;

    if (req.user.role === "patient") {
      // Patient requesting appointment
      const {
        doctorId: reqDoctorId,
        appointmentDate,
        appointmentTime,
        type,
        reason,
      } = req.body;
      patientId = req.patient.id;
      doctorId = reqDoctorId;
    } else if (req.user.role === "doctor") {
      // Doctor creating appointment for a patient
      const {
        patientId: reqPatientId,
        appointmentDate,
        appointmentTime,
        type,
        reason,
      } = req.body;
      patientId = reqPatientId;
      doctorId = req.doctor.id;

      // Validate that patient exists
      const patient = await database.legacyGet(
        "SELECT id FROM patients WHERE id = ?",
        [patientId],
      );
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to create appointments",
      });
    }

    // Check if doctor exists
    const doctor = await database.legacyGet(
      "SELECT id FROM doctors WHERE id = ?",
      [doctorId],
    );
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check for scheduling conflicts
    const conflictingAppointment = await database.legacyGet(
      `
            SELECT id FROM appointments
            WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?
        `,
      [doctorId, appointmentDate, appointmentTime],
    );

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    const result = await database.legacyRun(
      `
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `,
      [patientId, doctorId, appointmentDate, appointmentTime, type, reason],
    );

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: { appointmentId: result.id },
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
    });
  }
});

// Update appointment
router.put("/:id", async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status, notes, diagnosis, prescription } = req.body;

    // Get appointment
    const appointment = await database.legacyGet(
      `
            SELECT a.*, p.user_id as patient_user_id, d.user_id as doctor_user_id
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.id = ?
        `,
      [appointmentId],
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check permissions
    if (
      req.user.role === "patient" &&
      req.user.id !== appointment.patient_user_id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own appointments",
      });
    }

    if (
      req.user.role === "doctor" &&
      req.user.id !== appointment.doctor_user_id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update appointments with your patients",
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (status !== undefined) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }
    if (notes !== undefined) {
      updateFields.push("notes = ?");
      updateValues.push(notes);
    }
    if (diagnosis !== undefined && req.user.role === "doctor") {
      updateFields.push("diagnosis = ?");
      updateValues.push(diagnosis);
    }
    if (prescription !== undefined && req.user.role === "doctor") {
      updateFields.push("prescription = ?");
      updateValues.push(prescription);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(appointmentId);

    await database.legacyRun(
      `UPDATE appointments SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues,
    );

    // After update, if status changed to 'confirmed', send notification
    if (status === "confirmed") {
      const reminderService = require("../services/reminderService");
      try {
        const updatedAppointment = await database.legacyGet(
          `
                    SELECT * FROM appointments WHERE id = ?
                `,
          [appointmentId],
        );

        await reminderService.sendAppointmentApprovalNotification(
          updatedAppointment,
        );
      } catch (notifyError) {
        console.error(
          "Error sending appointment approval notification:",
          notifyError,
        );
      }
    }

    res.json({
      success: true,
      message: "Appointment updated successfully",
    });
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update appointment",
    });
  }
});

module.exports = router;
