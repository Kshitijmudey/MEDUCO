// dashboard.js - Dynamic real-time dashboard for both patient and doctor roles
class Dashboard {
  constructor() {
    this.api = window.meducoAPI;
    this.currentUser = null;
    this.dashboardData = {};
    this.isInitialized = false;
    this.updateQueue = [];
    this.isUpdating = false;
    this.refreshInterval = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    if (!this.api.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    this.currentUser = this.api.getUserData();
    if (!this.currentUser || !this.currentUser.role) {
      window.location.href = 'login.html';
      return;
    }

    console.log('Initializing dashboard for role:', this.currentUser.role);

    this.setupUI();
    this.setupEventListeners();
    this.setupRealTimeHandlers();

    await this.loadDashboardData();

    this.startRealTimeUpdates();

    this.isInitialized = true;
  }

  setupUI() {
    // Add real-time status indicator
    if (!document.getElementById('realtime-status')) {
      const indicator = document.createElement('div');
      indicator.id = 'realtime-status';
      indicator.className = 'realtime-status connecting';
      indicator.innerHTML = '<span>Connecting...</span>';
      document.body.appendChild(indicator);
    }

    // Add notification container
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    // Add offline indicator
    if (!document.getElementById('offline-indicator')) {
      const offline = document.createElement('div');
      offline.id = 'offline-indicator';
      offline.className = 'offline-indicator';
      offline.innerHTML = '⚠️ You are currently offline. Data may not be up to date.';
      document.body.appendChild(offline);
    }

    // Add loading overlay
    if (!document.getElementById('loading-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="loading-spinner"></div>';
      document.body.appendChild(overlay);
    }
  }

  setupEventListeners() {
    this.api.addEventListener('realtime_connected', () => {
      this.updateRealtimeStatus('connected', 'Connected');
    });

    this.api.addEventListener('realtime_disconnected', () => {
      this.updateRealtimeStatus('disconnected', 'Disconnected');
    });

    this.api.addEventListener('realtime_error', () => {
      this.updateRealtimeStatus('disconnected', 'Connection Error');
    });

    this.api.addEventListener('health_record_updated', (data) => {
      this.queueUpdate('health-records', data);
    });

    this.api.addEventListener('appointment_updated', (data) => {
      this.queueUpdate('appointments', data);
    });

    this.api.addEventListener('message_received', (data) => {
      this.queueUpdate('messages', data);
      this.updateMessageBadge();
    });

    this.api.addEventListener('medication_reminder', (data) => {
      this.showNotification(`⏰ ${data.message}`, 'warning', 30000);
    });

    this.api.addEventListener('care_plan_updated', (data) => {
      this.queueUpdate('care-plans', data);
    });

    window.addEventListener('online', () => {
      this.hideOfflineIndicator();
      this.refreshAllData();
    });

    window.addEventListener('offline', () => {
      this.showOfflineIndicator();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshAllData();
      }
    });

    window.addEventListener('focus', () => {
      this.refreshAllData();
    });
  }

  setupRealTimeHandlers() {
    // Additional real-time handlers can be added here if needed
  }

  async loadDashboardData() {
    this.showLoading();

    try {
      if (this.currentUser.role === 'patient') {
        await this.loadPatientData();
      } else if (this.currentUser.role === 'doctor') {
        await this.loadDoctorData();
      }
      this.renderDashboard();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showNotification('Failed to load dashboard data', 'error', 7000);
    } finally {
      this.hideLoading();
    }
  }

  async loadPatientData() {
    const [dashboard, appointments, healthRecords, medications, carePlans] = await Promise.all([
      this.api.getPatientDashboard(),
      this.api.getPatientAppointments({ limit: 5 }),
      this.api.getPatientHealthRecords({ limit: 10 }),
      this.api.getPatientMedications(),
      this.api.getPatientCarePlans()
    ]);

    this.dashboardData = {
      ...dashboard.data,
      recentAppointments: appointments.data?.appointments || [],
      healthRecords: healthRecords.data?.healthRecords || [],
      medications: medications.data?.medications || [],
      carePlans: carePlans.data?.carePlans || []
    };
  }

  async loadDoctorData() {
    const [dashboard, appointments, patients] = await Promise.all([
      this.api.getDoctorDashboard(),
      this.api.getAppointments({ limit: 10 }),
      this.api.getDoctorPatients()
    ]);

    this.dashboardData = {
      ...dashboard.data,
      recentAppointments: appointments.data?.appointments || [],
      patients: patients.data?.patients || []
    };
  }

  renderDashboard() {
    if (this.currentUser.role === 'patient') {
      this.renderPatientDashboard();
    } else if (this.currentUser.role === 'doctor') {
      this.renderDoctorDashboard();
    }
  }

  renderPatientDashboard() {
    // Update patient name and ID if elements exist
    const patientNameEl = document.getElementById('patientName');
    const patientIDDisplay = document.getElementById('patientIDDisplay');
    const patientIDEl = document.getElementById('patientID');

    if (patientNameEl && this.dashboardData.patient) {
      patientNameEl.textContent = `${this.dashboardData.patient.first_name} ${this.dashboardData.patient.last_name}`;
    }
    if (patientIDDisplay && patientIDEl && this.dashboardData.patient) {
      patientIDDisplay.style.display = 'block';
      patientIDEl.textContent = this.dashboardData.patient.patient_id;
    }

    // Render upcoming appointments table if exists
    const appointmentsTableBody = document.querySelector('#appointments tbody');
    if (appointmentsTableBody) {
      const upcoming = this.dashboardData.recentAppointments.filter(apt => new Date(apt.appointment_date) >= new Date());
      appointmentsTableBody.innerHTML = upcoming.map(apt => `
        <tr>
          <td>${apt.appointment_date}</td>
          <td>${apt.appointment_time}</td>
          <td>Dr. ${apt.doctor_first_name} ${apt.doctor_last_name}</td>
          <td>${apt.specialization || ''}</td>
        </tr>
      `).join('');
    }

    // Render health metrics if container exists
    const healthMetricsContainer = document.querySelector('.card:nth-of-type(2) > div');
    if (healthMetricsContainer) {
      const bloodSugar = this.dashboardData.healthRecords.find(r => r.record_type === 'blood_sugar');
      const bloodPressure = this.dashboardData.healthRecords.find(r => r.record_type === 'blood_pressure');
      const weight = this.dashboardData.healthRecords.find(r => r.record_type === 'weight');

      healthMetricsContainer.innerHTML = `
        ${bloodSugar ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--surface);border-radius:8px;border:1px solid var(--border);">
          <span style="color: var(--text);">Blood Glucose (Fasting)</span>
          <span style="font-weight:600;color:#059669;">${bloodSugar.value} ${bloodSugar.unit}</span>
        </div>` : ''}
        ${bloodPressure ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--surface);border-radius:8px;border:1px solid var(--border);">
          <span style="color: var(--text);">Blood Pressure</span>
          <span style="font-weight:600;color:#dc2626;">${bloodPressure.value} ${bloodPressure.unit}</span>
        </div>` : ''}
        ${weight ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--surface);border-radius:8px;border:1px solid var(--border);">
          <span style="color: var(--text);">Weight</span>
          <span style="font-weight:600;color:var(--text);">${weight.value} ${weight.unit}</span>
        </div>` : ''}
      `;
    }

    // Additional rendering for care plans, medications, etc. can be added here
  }

  renderDoctorDashboard() {
    // Update doctor name if element exists
    const doctorNameEl = document.getElementById('doctorName');
    if (doctorNameEl && this.dashboardData.doctor) {
      doctorNameEl.textContent = `Dr. ${this.dashboardData.doctor.first_name} ${this.dashboardData.doctor.last_name}`;
    }

    // Render overview cards if elements exist
    const totalPatientsCard = document.querySelector('.overview-card:nth-child(1) .overview-value');
    if (totalPatientsCard && this.dashboardData.totalPatients !== undefined) {
      totalPatientsCard.textContent = this.dashboardData.totalPatients;
    }

    const todayAppointmentsCard = document.querySelector('.overview-card:nth-child(2) .overview-value');
    if (todayAppointmentsCard && this.dashboardData.todayAppointments) {
      todayAppointmentsCard.textContent = this.dashboardData.todayAppointments.length;
    }

    const urgentAlertsCard = document.querySelector('.overview-card:nth-child(3) .overview-value');
    if (urgentAlertsCard && this.dashboardData.pendingAppointments !== undefined) {
      urgentAlertsCard.textContent = this.dashboardData.pendingAppointments;
    }

    // Render today's appointments table if exists
    const appointmentsTableBody = document.querySelector('table tbody');
    if (appointmentsTableBody && this.dashboardData.todayAppointments) {
      appointmentsTableBody.innerHTML = this.dashboardData.todayAppointments.map(apt => `
        <tr>
          <td>${apt.appointment_time}</td>
          <td>${apt.first_name} ${apt.last_name}</td>
          <td>${apt.reason || apt.type}</td>
        </tr>
      `).join('');
    }

    // Additional rendering for AI insights, charts, etc. can be added here
  }

  queueUpdate(section, data) {
    this.updateQueue.push({ section, data, timestamp: Date.now() });
    if (!this.isUpdating) {
      this.processUpdateQueue();
    }
  }

  async processUpdateQueue() {
    this.isUpdating = true;
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift();
      if (Date.now() - update.timestamp > 30000) continue;
      await this.processUpdate(update);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.isUpdating = false;
  }

  async processUpdate(update) {
    try {
      switch (update.section) {
        case 'health-records':
          if (this.currentUser.role === 'patient') {
            await this.loadPatientData();
            this.renderHealthMetrics();
          }
          break;
        case 'appointments':
          if (this.currentUser.role === 'patient') {
            const appointments = await this.api.getPatientAppointments({ limit: 5 });
            this.dashboardData.recentAppointments = appointments.data?.appointments || [];
            this.renderUpcomingAppointments();
          } else if (this.currentUser.role === 'doctor') {
            const appointments = await this.api.getAppointments({ limit: 10 });
            this.dashboardData.recentAppointments = appointments.data?.appointments || [];
            this.renderDoctorDashboard();
          }
          break;
        case 'messages':
          this.updateMessageBadge();
          break;
        default:
          console.log(`Unknown update section: ${update.section}`);
      }
    } catch (error) {
      console.error(`Error processing update for ${update.section}:`, error);
    }
  }

  updateRealtimeStatus(status, message) {
    const indicator = document.getElementById('realtime-status');
    if (indicator) {
      indicator.className = `realtime-status ${status}`;
      indicator.innerHTML = `<span>${message}</span>`;
    }
  }

  showOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) indicator.classList.add('show');
  }

  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) indicator.classList.remove('show');
  }

  showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('show');
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, duration);
  }

  updateMessageBadge() {
    this.api.getMessages('inbox', { unread: true }).then(response => {
      if (!response.success) return;
      const count = response.data.messages.length;
      const badge = document.querySelector('.message-badge');
      if (badge) {
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'inline' : 'none';
      }
    }).catch(console.error);
  }

  refreshAllData() {
    return this.loadDashboardData();
  }

  startRealTimeUpdates() {
    if (!this.api.isRealTimeConnected()) {
      this.api.connectRealTime();
    }
    this.refreshInterval = setInterval(() => {
      this.refreshAllData();
    }, 300000);
  }

  stopRealTimeUpdates() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  destroy() {
    this.stopRealTimeUpdates();
    this.api.disconnectRealTime();

    this.api.removeEventListener('realtime_connected');
    this.api.removeEventListener('realtime_disconnected');
    this.api.removeEventListener('health_record_updated');
    this.api.removeEventListener('appointment_updated');
    this.api.removeEventListener('message_received');

    this.isInitialized = false;
  }
}

window.dashboard = new Dashboard();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dashboard.initialize();
  });
} else {
  window.dashboard.initialize();
}

window.addEventListener('beforeunload', () => {
  window.dashboard.destroy();
});
