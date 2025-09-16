document.addEventListener('DOMContentLoaded', () => {
  const btnNewAppointment = document.getElementById('btnNewAppointment');
  const btnExportAppointments = document.getElementById('btnExportAppointments');
  const newAppointmentModal = document.getElementById('newAppointmentModal');
  const viewAppointmentModal = document.getElementById('viewAppointmentModal');
  const closeNewAppointmentModal = document.getElementById('closeNewAppointmentModal');
  const closeViewAppointmentModal = document.getElementById('closeViewAppointmentModal');
  const newAppointmentForm = document.getElementById('newAppointmentForm');
  const btnApproveAppointment = document.getElementById('btnApproveAppointment');
  const btnMarkDoneAppointment = document.getElementById('btnMarkDoneAppointment');
  const appointmentsTableBody = document.getElementById('appointmentsTableBody');

  let currentAppointmentId = null;
  let allAppointments = [];

  // Load modal HTML files
  async function loadModals() {
    try {
      const [newAppointmentResponse, exportResponse] = await Promise.all([
        fetch('new-appointment-modal.html'),
        fetch('export-appointment-modal.html')
      ]);

      const newAppointmentHtml = await newAppointmentResponse.text();
      const exportHtml = await exportResponse.text();

      document.getElementById('newAppointmentModalContainer').innerHTML = newAppointmentHtml;
      document.getElementById('exportAppointmentModalContainer').innerHTML = exportHtml;

      // Re-bind event listeners after loading modals
      bindModalEvents();
    } catch (error) {
      console.error('Error loading modals:', error);
    }
  }

  function bindModalEvents() {
    // New appointment modal events
    const btnLookupPatient = document.getElementById('btnLookupPatient');
    const btnBackToLookup = document.getElementById('btnBackToLookup');
    const closeNewAppointmentModal = document.getElementById('closeNewAppointmentModal');
    const closeExportAppointmentModal = document.getElementById('closeExportAppointmentModal');
    const exportAppointmentForm = document.getElementById('exportAppointmentForm');
    const exportAppointmentModal = document.getElementById('exportAppointmentModal');

    if (btnLookupPatient) {
      btnLookupPatient.addEventListener('click', lookupPatient);
    }

    if (btnBackToLookup) {
      btnBackToLookup.addEventListener('click', () => {
        document.getElementById('patientLookupStep').style.display = 'block';
        document.getElementById('appointmentDetailsStep').style.display = 'none';
      });
    }

    if (closeNewAppointmentModal) {
      closeNewAppointmentModal.addEventListener('click', () => {
        newAppointmentModal.style.display = 'none';
        resetNewAppointmentModal();
      });
    }

    if (closeExportAppointmentModal) {
      closeExportAppointmentModal.addEventListener('click', () => {
        exportAppointmentModal.style.display = 'none';
      });
    }

    if (exportAppointmentForm) {
      exportAppointmentForm.addEventListener('submit', exportSingleAppointment);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === newAppointmentModal) {
        newAppointmentModal.style.display = 'none';
        resetNewAppointmentModal();
      }
      if (event.target === viewAppointmentModal) {
        viewAppointmentModal.style.display = 'none';
      }
      if (event.target === exportAppointmentModal) {
        exportAppointmentModal.style.display = 'none';
      }
    });
  }

  function resetNewAppointmentModal() {
    document.getElementById('patientLookupStep').style.display = 'block';
    document.getElementById('appointmentDetailsStep').style.display = 'none';
    document.getElementById('patientLookup').value = '';
    document.getElementById('patientLookupResult').innerHTML = '';
    document.getElementById('newAppointmentForm').reset();
  }

  async function lookupPatient() {
    const lookupValue = document.getElementById('patientLookup').value.trim();
    if (!lookupValue) {
      alert('Please enter a patient name or ID');
      return;
    }

    try {
      // Try to find patient by ID first, then by name
      const response = await window.meducoAPI.getPatients({ search: lookupValue });

      if (response.success && response.data.patients.length > 0) {
        const patient = response.data.patients[0];
        showPatientFound(patient);
      } else {
        showNewPatientForm(lookupValue);
      }
    } catch (error) {
      console.error('Error looking up patient:', error);
      showNewPatientForm(lookupValue);
    }
  }

  function showPatientFound(patient) {
    const resultDiv = document.getElementById('patientLookupResult');
    resultDiv.innerHTML = `
      <div style="padding: 16px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px; color: #0ea5e9;">Patient Found</h4>
        <p style="margin: 0;"><strong>Name:</strong> ${patient.first_name} ${patient.last_name}</p>
        <p style="margin: 0;"><strong>ID:</strong> ${patient.patient_id}</p>
        <button type="button" class="btn btn-primary" id="btnProceedWithPatient" style="margin-top: 12px;">Proceed with Appointment</button>
      </div>
    `;

    document.getElementById('btnProceedWithPatient').addEventListener('click', () => {
      document.getElementById('selectedPatientId').value = patient.id;
      document.getElementById('appointmentStepTitle').textContent = `Schedule Appointment for ${patient.first_name} ${patient.last_name}`;
      document.getElementById('patientLookupStep').style.display = 'none';
      document.getElementById('appointmentDetailsStep').style.display = 'block';
    });
  }

  function showNewPatientForm(lookupValue) {
    const resultDiv = document.getElementById('patientLookupResult');
    resultDiv.innerHTML = `
      <div style="padding: 16px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px; color: #f59e0b;">Patient Not Found</h4>
        <p style="margin: 0;">No patient found with "${lookupValue}". Would you like to create a new patient?</p>
        <button type="button" class="btn btn-primary" id="btnCreateNewPatient" style="margin-top: 12px;">Create New Patient</button>
      </div>
    `;

    document.getElementById('btnCreateNewPatient').addEventListener('click', () => {
      // Generate new patient ID
      const newPatientId = generatePatientID();
      document.getElementById('selectedPatientId').value = 'new';
      document.getElementById('appointmentStepTitle').textContent = `Create New Patient & Schedule Appointment`;

      // Add patient creation fields to the form
      const form = document.getElementById('newAppointmentForm');
      const patientIdField = document.createElement('div');
      patientIdField.innerHTML = `
        <label for="newPatientId">New Patient ID:</label>
        <input type="text" id="newPatientId" name="newPatientId" value="${newPatientId}" readonly>

        <label for="patientFirstName">First Name:</label>
        <input type="text" id="patientFirstName" name="patientFirstName" required>

        <label for="patientLastName">Last Name:</label>
        <input type="text" id="patientLastName" name="patientLastName" required>

        <label for="patientEmail">Email:</label>
        <input type="email" id="patientEmail" name="patientEmail" required>

        <label for="patientPhone">Phone:</label>
        <input type="tel" id="patientPhone" name="patientPhone" required>
      `;

      // Insert before the appointment date field
      const dateField = form.querySelector('#appointmentDate').parentNode;
      form.insertBefore(patientIdField, dateField);

      document.getElementById('patientLookupStep').style.display = 'none';
      document.getElementById('appointmentDetailsStep').style.display = 'block';
    });
  }

  function generatePatientID() {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `PAT-${currentYear}-${randomNum}`;
  }

  async function loadAppointments() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await window.meducoAPI.getAppointments({ date: today });
      if (response.success) {
        allAppointments = response.data.appointments;
        populateAppointmentsTable(allAppointments);
        updateAppointmentSummary(allAppointments);
      } else {
        console.error('Failed to load appointments:', response.message);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  }

  async function loadUpcomingAppointments() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekFromNowStr = weekFromNow.toISOString().split('T')[0];

      // Get tomorrow's appointments
      const tomorrowResponse = await window.meducoAPI.getAppointments({ date: tomorrowStr });
      const tomorrowCount = tomorrowResponse.success ? tomorrowResponse.data.appointments.length : 0;

      // Get this week's appointments (excluding today and tomorrow)
      const weekResponse = await window.meducoAPI.getAppointments({
        date: new Date().toISOString().split('T')[0],
        limit: 100
      });
      let thisWeekCount = 0;
      if (weekResponse.success) {
        const today = new Date().toISOString().split('T')[0];
        thisWeekCount = weekResponse.data.appointments.filter(app =>
          app.appointment_date > tomorrowStr && app.appointment_date <= weekFromNowStr
        ).length;
      }

      // Get next week's appointments
      const nextWeekStart = new Date();
      nextWeekStart.setDate(nextWeekStart.getDate() + 8);
      const nextWeekEnd = new Date();
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);

      const nextWeekResponse = await window.meducoAPI.getAppointments({
        date: nextWeekStart.toISOString().split('T')[0],
        limit: 100
      });
      let nextWeekCount = 0;
      if (nextWeekResponse.success) {
        nextWeekCount = nextWeekResponse.data.appointments.filter(app =>
          app.appointment_date >= nextWeekStart.toISOString().split('T')[0] &&
          app.appointment_date <= nextWeekEnd.toISOString().split('T')[0]
        ).length;
      }

      updateUpcomingAppointmentsDisplay(tomorrowCount, thisWeekCount, nextWeekCount);
    } catch (error) {
      console.error('Error loading upcoming appointments:', error);
    }
  }

  function updateUpcomingAppointmentsDisplay(tomorrowCount, thisWeekCount, nextWeekCount) {
    const tomorrowElement = document.querySelector('.mini-card .mini-value');
    const thisWeekElement = document.querySelectorAll('.mini-card .mini-value')[1];
    const nextWeekElement = document.querySelectorAll('.mini-card .mini-value')[2];

    if (tomorrowElement) tomorrowElement.textContent = `${tomorrowCount} appointments`;
    if (thisWeekElement) thisWeekElement.textContent = `${thisWeekCount} appointments`;
    if (nextWeekElement) nextWeekElement.textContent = `${nextWeekCount} appointments`;
  }

  function updateAppointmentSummary(appointments) {
    const totalTodayElement = document.querySelectorAll('.mini-card .mini-value')[3];
    const confirmedElement = document.querySelectorAll('.mini-card .mini-value')[4];
    const pendingElement = document.querySelectorAll('.mini-card .mini-value')[5];

    const totalToday = appointments.length;
    const confirmed = appointments.filter(app => app.status === 'confirmed').length;
    const pending = appointments.filter(app => app.status === 'pending').length;

    if (totalTodayElement) totalTodayElement.textContent = `${totalToday} appointments`;
    if (confirmedElement) confirmedElement.textContent = `${confirmed} appointments`;
    if (pendingElement) pendingElement.textContent = `${pending} appointments`;
  }

  function populateAppointmentsTable(appointments) {
    appointmentsTableBody.innerHTML = '';
    if (!appointments || appointments.length === 0) {
      appointmentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No appointments found</td></tr>';
      return;
    }
    appointments.forEach(appointment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${appointment.appointment_time}</td>
        <td>${appointment.patient_first_name} ${appointment.patient_last_name}</td>
        <td>${appointment.patient_id}</td>
        <td>${appointment.type}</td>
        <td><span class="badge ${getStatusClass(appointment.status)}">${appointment.status}</span></td>
        <td>
          <button class="btn btn-outline view-btn" style="padding: 4px 8px; font-size: 12px;" data-id="${appointment.id}">View</button>
          <button class="btn btn-outline export-btn" style="padding: 4px 8px; font-size: 12px; margin-left: 4px;" data-id="${appointment.id}">Export</button>
        </td>
      `;
      appointmentsTableBody.appendChild(row);
    });
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const appointmentId = e.target.getAttribute('data-id');
        viewAppointment(appointmentId);
      });
    });
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const appointmentId = e.target.getAttribute('data-id');
        exportFromAppointment(appointmentId);
      });
    });
  }

  function getStatusClass(status) {
    switch (status.toLowerCase()) {
      case 'confirmed': return '';
      case 'pending': return 'warning';
      case 'cancelled': return 'alert';
      case 'completed': return 'success';
      default: return '';
    }
  }

  async function viewAppointment(appointmentId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await window.meducoAPI.getAppointments({ date: today });
      if (response.success) {
        const appointment = response.data.appointments.find(app => app.id == appointmentId);
        if (appointment) {
          currentAppointmentId = appointmentId;
          const detailsDiv = document.getElementById('appointmentDetails');
          detailsDiv.innerHTML = `
            <p><strong>Patient:</strong> ${appointment.patient_first_name} ${appointment.patient_last_name}</p>
            <p><strong>Patient ID:</strong> ${appointment.patient_id}</p>
            <p><strong>Date:</strong> ${appointment.appointment_date}</p>
            <p><strong>Time:</strong> ${appointment.appointment_time}</p>
            <p><strong>Type:</strong> ${appointment.type}</p>
            <p><strong>Reason:</strong> ${appointment.reason || 'N/A'}</p>
            <p><strong>Status:</strong> ${appointment.status}</p>
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
            ${appointment.diagnosis ? `<p><strong>Diagnosis:</strong> ${appointment.diagnosis}</p>` : ''}
            ${appointment.prescription ? `<p><strong>Prescription:</strong> ${appointment.prescription}</p>` : ''}
          `;
          viewAppointmentModal.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('Error viewing appointment:', error);
    }
  }

  async function createNewAppointment(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const selectedPatientId = document.getElementById('selectedPatientId').value;

    if (selectedPatientId === 'new') {
      // Create new patient first
      const patientData = {
        patientId: formData.get('newPatientId'),
        firstName: formData.get('patientFirstName'),
        lastName: formData.get('patientLastName'),
        email: formData.get('patientEmail'),
        phone: formData.get('patientPhone')
      };

      try {
        const patientResponse = await window.meducoAPI.createPatient(patientData);
        if (!patientResponse.success) {
          alert('Failed to create patient: ' + patientResponse.message);
          return;
        }
        // Use the newly created patient's ID
        formData.set('patientId', patientResponse.data.patient.id);
      } catch (error) {
        console.error('Error creating patient:', error);
        alert('Error creating patient: ' + error.message);
        return;
      }
    }

    const appointmentData = {
      patientId: formData.get('patientId'),
      appointmentDate: formData.get('appointmentDate'),
      appointmentTime: formData.get('appointmentTime'),
      type: formData.get('appointmentType'),
      reason: formData.get('reason')
    };

    try {
      const response = await window.meducoAPI.createAppointment(appointmentData);

      if (response.success) {
        alert('Appointment created successfully!');
        newAppointmentModal.style.display = 'none';
        event.target.reset();
        loadAppointments();
        loadUpcomingAppointments();
      } else {
        alert('Failed to create appointment: ' + response.message);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error creating appointment: ' + error.message);
    }
  }

  async function approveAppointment(appointmentId) {
    try {
      const response = await window.meducoAPI.updateAppointment(appointmentId, { status: 'confirmed' });

      if (response.success) {
        alert('Appointment approved!');
        viewAppointmentModal.style.display = 'none';
        loadAppointments();
        loadUpcomingAppointments();
      } else {
        alert('Failed to approve appointment: ' + response.message);
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      alert('Error approving appointment: ' + error.message);
    }
  }

  async function markAppointmentDone(appointmentId) {
    try {
      const response = await window.meducoAPI.updateAppointment(appointmentId, { status: 'completed' });

      if (response.success) {
        alert('Appointment marked as done!');
        viewAppointmentModal.style.display = 'none';
        loadAppointments();
        loadUpcomingAppointments();
      } else {
        alert('Failed to mark appointment as done: ' + response.message);
      }
    } catch (error) {
      console.error('Error marking appointment as done:', error);
      alert('Error marking appointment as done: ' + error.message);
    }
  }

  async function exportAppointments() {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const response = await window.meducoAPI.getAppointments({ date: today.toISOString().split('T')[0] });
      if (response.success && response.data.appointments.length > 0) {
        const exportPromises = response.data.appointments.map(async appointment => {
          const newAppointmentData = {
            patientId: appointment.patient_id,
            appointmentDate: tomorrowStr,
            appointmentTime: appointment.appointment_time,
            type: appointment.type,
            reason: `Exported from ${appointment.appointment_date} - ${appointment.reason || ''}`
          };
          return window.meducoAPI.createAppointment(newAppointmentData);
        });
        const results = await Promise.all(exportPromises);
        const successCount = results.filter(r => r.success).length;
        alert(`Exported ${successCount} appointments to ${tomorrow.toLocaleDateString()}`);
        loadAppointments();
        loadUpcomingAppointments();
      } else {
        alert('No appointments to export');
      }
    } catch (error) {
      console.error('Error exporting appointments:', error);
      alert('Error exporting appointments: ' + error.message);
    }
  }

  async function exportSingleAppointment(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const patientId = formData.get('patientId');
    const appointmentDate = formData.get('appointmentDate');
    const reason = formData.get('reason');

    try {
      const response = await window.meducoAPI.createAppointment({
        patientId: patientId,
        appointmentDate: appointmentDate,
        appointmentTime: '09:00', // Default time
        type: 'follow-up',
        reason: reason
      });

      if (response.success) {
        alert('Appointment exported successfully!');
        document.getElementById('exportAppointmentModal').style.display = 'none';
        event.target.reset();
        loadAppointments();
        loadUpcomingAppointments();
      } else {
        alert('Failed to export appointment: ' + response.message);
      }
    } catch (error) {
      console.error('Error exporting appointment:', error);
      alert('Error exporting appointment: ' + error.message);
    }
  }

  function exportFromAppointment(appointmentId) {
    const appointment = allAppointments.find(app => app.id == appointmentId);
    if (appointment) {
      document.getElementById('exportPatientId').value = appointment.patient_id;
      document.getElementById('exportAppointmentModal').style.display = 'block';
    }
  }

  // Initialize
  if (btnNewAppointment) {
    btnNewAppointment.addEventListener('click', () => {
      newAppointmentModal.style.display = 'block';
    });
  }

  if (btnExportAppointments) {
    btnExportAppointments.addEventListener('click', exportAppointments);
  }

  if (closeNewAppointmentModal) {
    closeNewAppointmentModal.addEventListener('click', () => {
      newAppointmentModal.style.display = 'none';
      resetNewAppointmentModal();
    });
  }

  if (closeViewAppointmentModal) {
    closeViewAppointmentModal.addEventListener('click', () => {
      viewAppointmentModal.style.display = 'none';
    });
  }

  if (newAppointmentForm) {
    newAppointmentForm.addEventListener('submit', createNewAppointment);
  }

  if (btnApproveAppointment) {
    btnApproveAppointment.addEventListener('click', () => approveAppointment(currentAppointmentId));
  }

  if (btnMarkDoneAppointment) {
    btnMarkDoneAppointment.addEventListener('click', () => markAppointmentDone(currentAppointmentId));
  }

  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === newAppointmentModal) {
      newAppointmentModal.style.display = 'none';
      resetNewAppointmentModal();
    }
    if (event.target === viewAppointmentModal) {
      viewAppointmentModal.style.display = 'none';
    }
    if (event.target === document.getElementById('exportAppointmentModal')) {
      document.getElementById('exportAppointmentModal').style.display = 'none';
    }
  });

  // Load initial data
  loadModals();
  loadAppointments();
  loadUpcomingAppointments();
});
