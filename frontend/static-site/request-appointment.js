// Request Appointment Page Script
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!window.meducoAPI.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const userData = window.meducoAPI.getUserData();
    if (userData.role !== 'patient') {
        alert('Only patients can request appointments');
        window.location.href = 'login.html';
        return;
    }

    // Load doctors
    loadDoctors();

    // Load upcoming appointments
    loadUpcomingAppointments();

    // Set up form submission
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentSubmit);
    }

    // Set up doctor change to load available slots
    const doctorSelect = document.getElementById('doctorSelect');
    if (doctorSelect) {
        doctorSelect.addEventListener('change', function() {
            const doctorId = this.value;
            if (doctorId) {
                loadAvailableSlots(doctorId);
            } else {
                const slotsContainer = document.querySelector('.card:nth-child(2) .card > div');
                if (slotsContainer) {
                    slotsContainer.innerHTML = '<div>Please select a doctor and date to see available slots.</div>';
                }
            }
        });
    }

    // Set up date change to reload slots
    const dateInput = document.querySelector('input[name="preferred-date"]');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            const doctorId = doctorSelect.value;
            if (doctorId) {
                loadAvailableSlots(doctorId);
            }
        });

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }
});

async function loadDoctors() {
    try {
        const doctors = await window.meducoAPI.getDoctors();
        const doctorSelect = document.getElementById('doctorSelect');

        if (doctorSelect && doctors.length > 0) {
            doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = `Dr. ${doctor.first_name} ${doctor.last_name} - ${doctor.specialization}`;
                doctorSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load doctors:', error);
        alert('Failed to load doctors. Please try again.');
    }
}

async function loadAvailableSlots(doctorId) {
    try {
        const dateInput = document.querySelector('input[name="preferred-date"]');
        const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

        const slots = await window.meducoAPI.getDoctorSlots(doctorId, date);
        const slotsContainer = document.querySelector('.card:nth-child(2) .card > div');

        if (slotsContainer) {
            if (slots.length === 0) {
                slotsContainer.innerHTML = '<div>No available slots for this date.</div>';
                return;
            }

            slotsContainer.innerHTML = '<h4>Available Slots:</h4><div class="slots-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-top: 12px;">';
            slots.forEach(slot => {
                const slotDiv = document.createElement('div');
                slotDiv.className = 'slot-item';
                slotDiv.textContent = slot.slice(0, 5); // HH:MM
                slotDiv.style.cssText = 'padding: 8px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; text-align: center; cursor: pointer; transition: all 0.2s;';
                slotDiv.addEventListener('click', () => selectSlot(slot));
                slotsContainer.appendChild(slotDiv);
            });
            slotsContainer.innerHTML += '</div>';
        }
    } catch (error) {
        console.error('Failed to load available slots:', error);
        const slotsContainer = document.querySelector('.card:nth-child(2) .card > div');
        if (slotsContainer) {
            slotsContainer.innerHTML = '<div>Failed to load available slots.</div>';
        }
    }
}

function selectSlot(time) {
    // Remove selected class from all slots
    document.querySelectorAll('.slot-item').forEach(item => {
        item.classList.remove('selected');
        item.style.background = '#f0f9ff';
        item.style.borderColor = '#0ea5e9';
    });

    // Add selected class to clicked slot
    event.target.classList.add('selected');
    event.target.style.background = '#0ea5e9';
    event.target.style.color = 'white';
    event.target.style.borderColor = '#0284c7';

    // Set the time in hidden input
    const timeInput = document.getElementById('appointmentTimeInput');
    if (timeInput) {
        timeInput.value = time;
    }

    // Update preferred time select to match
    const preferredTimeSelect = document.getElementById('preferredTimeSelect');
    if (preferredTimeSelect) {
        const hour = parseInt(time.split(':')[0]);
        let timeRange = 'morning';
        if (hour >= 13 && hour <= 16) timeRange = 'afternoon';
        else if (hour >= 17) timeRange = 'evening';

        preferredTimeSelect.value = timeRange;
    }
}

async function loadUpcomingAppointments() {
    try {
        const response = await window.meducoAPI.getAppointments({ limit: 5 });
        const appointments = response.data.appointments;

        const tbody = document.querySelector('tbody');
        if (tbody && appointments.length > 0) {
            tbody.innerHTML = '';
            appointments.forEach(appointment => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${appointment.appointment_date} - ${appointment.appointment_time}</td>
                    <td>Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name}</td>
                    <td>${appointment.type}</td>
                    <td><span class="badge ${getStatusClass(appointment.status)}">${appointment.status}</span></td>
                `;
                tbody.appendChild(row);
            });
        } else if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No upcoming appointments</td></tr>';
        }
    } catch (error) {
        console.error('Failed to load upcoming appointments:', error);
        const tbody = document.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Failed to load appointments</td></tr>';
        }
    }
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

async function handleAppointmentSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const appointmentData = {
        doctorId: parseInt(formData.get('doctor')),
        appointmentDate: formData.get('preferred-date'),
        appointmentTime: formData.get('appointment-time'),
        type: formData.get('type'),
        reason: formData.get('reason')
    };

    if (!appointmentData.doctorId || !appointmentData.appointmentDate || !appointmentData.appointmentTime) {
        alert('Please fill in all required fields and select a time slot.');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Requesting...';
    submitBtn.disabled = true;

    try {
        const response = await window.meducoAPI.createAppointment(appointmentData);
        if (response.success) {
            const formNote = document.getElementById('formNote');
            if (formNote) {
                formNote.innerHTML = '<div style="color: green; margin-top: 10px;">Appointment requested successfully!</div>';
            }
            event.target.reset();
            loadUpcomingAppointments(); // Refresh the list
        } else {
            const formNote = document.getElementById('formNote');
            if (formNote) {
                formNote.innerHTML = `<div style="color: red; margin-top: 10px;">Failed to request appointment: ${response.message}</div>`;
            }
        }
    } catch (error) {
        console.error('Appointment request failed:', error);
        const formNote = document.getElementById('formNote');
        if (formNote) {
            formNote.innerHTML = '<div style="color: red; margin-top: 10px;">Failed to request appointment. Please try again.</div>';
        }
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}
