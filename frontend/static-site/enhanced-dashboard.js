// Enhanced Dashboard with Real-time Features
class EnhancedDashboard {
  constructor() {
    this.api = window.meducoAPI;
    this.charts = new Map();
    this.refreshInterval = null;
    this.realTimeUpdates = new Map();
    this.isInitialized = false;
    this.currentUser = null;
    this.dashboardData = {};
    this.updateQueue = [];
    this.isUpdating = false;
  }

  // Initialize dashboard
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Check authentication
      if (!this.api.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
      }

      this.currentUser = this.api.getUserData();
      console.log('🚀 Initializing enhanced dashboard for:', this.currentUser.role);

      // Setup UI
      this.setupUI();
      this.setupEventListeners();
      this.setupRealTimeHandlers();

      // Load initial data
      await this.loadDashboardData();

      // Start real-time updates
      this.startRealTimeUpdates();

      this.isInitialized = true;
      console.log('✅ Dashboard initialized successfully');

    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      this.showError('Failed to initialize dashboard');
    }
  }

  // Setup UI elements
  setupUI() {
    // Add real-time status indicator
    this.createRealtimeStatusIndicator();

    // Add notification container
    this.createNotificationContainer();

    // Add offline indicator
    this.createOfflineIndicator();

    // Add loading overlay
    this.createLoadingOverlay();

    // Add quick actions menu
    this.createQuickActions();

    // Setup dashboard layout based on user role
    if (this.currentUser.role === 'patient') {
      this.setupPatientDashboard();
    } else if (this.currentUser.role === 'doctor') {
      this.setupDoctorDashboard();
    }
  }

  // Create real-time status indicator
  createRealtimeStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'realtime-status';
    indicator.className = 'realtime-status connecting';
    indicator.innerHTML = '<span>Connecting...</span>';
    document.body.appendChild(indicator);
  }

  // Create notification container
  createNotificationContainer() {
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
  }

  // Create offline indicator
  createOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.innerHTML = '⚠️ You are currently offline. Data may not be up to date.';
    document.body.appendChild(indicator);
  }

  // Create loading overlay
  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
  }

  // Create quick actions menu
  createQuickActions() {
    const actions = document.createElement('div');
    actions.className = 'quick-actions';

    if (this.currentUser.role === 'patient') {
      actions.innerHTML = `
        <button class="quick-action-btn" onclick="dashboard.quickLogHealth()" title="Log Health Data">
          <i class="fas fa-plus"></i>
        </button>
        <button class="quick-action-btn" onclick="dashboard.quickBookAppointment()" title="Book Appointment">
          <i class="fas fa-calendar"></i>
        </button>
      `;
    } else if (this.currentUser.role === 'doctor') {
      actions.innerHTML = `
        <button class="quick-action-btn" onclick="dashboard.quickAddPatient()" title="Add Patient">
          <i class="fas fa-user-plus"></i>
        </button>
        <button class="quick-action-btn" onclick="dashboard.quickViewSchedule()" title="View Schedule">
          <i class="fas fa-calendar-check"></i>
        </button>
      `;
    }

    document.body.appendChild(actions);
  }

  // Setup event listeners
  setupEventListeners() {
    // Real-time connection events
    this.api.addEventListener('realtime_connected', () => {
      this.updateRealtimeStatus('connected', 'Connected');
    });

    this.api.addEventListener('realtime_disconnected', () => {
      this.updateRealtimeStatus('disconnected', 'Disconnected');
    });

    this.api.addEventListener('realtime_error', () => {
      this.updateRealtimeStatus('disconnected', 'Connection Error');
    });

    // Data update events
    this.api.addEventListener('health_record_updated', (data) => {
      this.handleHealthRecordUpdate(data);
    });

    this.api.addEventListener('appointment_updated', (data) => {
      this.handleAppointmentUpdate(data);
    });

    this.api.addEventListener('message_received', (data) => {
      this.handleMessageReceived(data);
    });

    this.api.addEventListener('critical_alert', (data) => {
      this.handleCriticalAlert(data);
    });

    // Network status events
    window.addEventListener('online', () => {
      this.hideOfflineIndicator();
      this.refreshAllData();
    });

    window.addEventListener('offline', () => {
      this.showOfflineIndicator();
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshAllData();
      }
    });

    // Auto-refresh on focus
    window.addEventListener('focus', () => {
      this.refreshAllData();
    });
  }

  // Setup real-time data handlers
  setupRealTimeHandlers() {
    // Health record updates
    this.api.addEventListener('health_record_updated', (data) => {
      this.queueUpdate('health-records', data);
    });

    // Appointment updates
    this.api.addEventListener('appointment_updated', (data) => {
      this.queueUpdate('appointments', data);
    });

    // New messages
    this.api.addEventListener('message_received', (data) => {
      this.queueUpdate('messages', data);
      this.updateMessageBadge();
    });

    // Medication reminders
    this.api.addEventListener('medication_reminder', (data) => {
      this.showMedicationReminder(data);
    });

    // Care plan updates
    this.api.addEventListener('care_plan_updated', (data) => {
      this.queueUpdate('care-plans', data);
    });
  }

  // Load initial dashboard data
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
      this.showError('Failed to load dashboard data');
    } finally {
      this.hideLoading();
    }
  }

  // Load patient-specific data
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

  // Load doctor-specific data
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

  // Setup patient dashboard layout
  setupPatientDashboard() {
    const mainContent = document.querySelector('.main-content') || document.body;

    // Create dashboard sections
    const sections = [
      { id: 'health-overview', title: 'Health Overview', class: 'health-metrics-section' },
      { id: 'upcoming-appointments', title: 'Upcoming Appointments', class: 'appointments-section' },
      { id: 'health-trends', title: 'Health Trends', class: 'charts-section' },
      { id: 'medications', title: 'Current Medications', class: 'medications-section' },
      { id: 'care-plans', title: 'Care Plans', class: 'care-plans-section' }
    ];

    this.createDashboardSections(sections);
  }

  // Setup doctor dashboard layout
  setupDoctorDashboard() {
    const mainContent = document.querySelector('.main-content') || document.body;

    // Create dashboard sections
    const sections = [
      { id: 'doctor-overview', title: 'Today Overview', class: 'overview-section' },
      { id: 'todays-appointments', title: "Today's Appointments", class: 'appointments-section' },
      { id: 'recent-patients', title: 'Recent Patients', class: 'patients-section' },
      { id: 'pending-tasks', title: 'Pending Tasks', class: 'tasks-section' }
    ];

    this.createDashboardSections(sections);
  }

  // Create dashboard sections
  createDashboardSections(sections) {
    const container = document.querySelector('.dashboard-container') || document.createElement('div');
    container.className = 'dashboard-container';

    sections.forEach(section => {
      const sectionEl = document.createElement('div');
      sectionEl.id = section.id;
      sectionEl.className = `dashboard-section ${section.class}`;
      sectionEl.innerHTML = `
        <div class="section-header">
          <h3 class="section-title">${section.title}</h3>
          <div class="section-actions">
            <button class="btn-refresh" onclick="dashboard.refreshSection('${section.id}')">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        <div class="section-content" id="${section.id}-content">
          <div class="loading-placeholder">Loading...</div>
        </div>
      `;
      container.appendChild(sectionEl);
    });

    if (!document.querySelector('.dashboard-container')) {
      document.body.appendChild(container);
    }
  }

  // Render dashboard content
  renderDashboard() {
    if (this.currentUser.role === 'patient') {
      this.renderPatientDashboard();
    } else if (this.currentUser.role === 'doctor') {
      this.renderDoctorDashboard();
    }
  }

  // Render patient dashboard
  renderPatientDashboard() {
    // Health overview metrics
    this.renderHealthMetrics();

    // Upcoming appointments
    this.renderUpcomingAppointments();

    // Health trends charts
    this.renderHealthTrends();

    // Current medications
    this.renderMedications();

    // Care plans
    this.renderCarePlans();
  }

  // Render doctor dashboard
  renderDoctorDashboard() {
    // Today's overview
    this.renderDoctorOverview();

    // Today's appointments
    this.renderTodaysAppointments();

    // Recent patients
    this.renderRecentPatients();

    // Pending tasks
    this.renderPendingTasks();
  }

  // Render health metrics
  renderHealthMetrics() {
    const container = document.getElementById('health-overview-content');
    if (!container) return;

    const latestRecords = this.getLatestHealthRecords();

    container.innerHTML = `
      <div class="health-metrics-grid">
        ${latestRecords.map(record => `
          <div class="health-metric ${this.getHealthMetricClass(record)}" data-type="${record.record_type}">
            <div class="health-metric-value">${record.value} ${record.unit || ''}</div>
            <div class="health-metric-label">${this.formatRecordType(record.record_type)}</div>
            <div class="health-metric-time">${this.formatTimeAgo(record.recorded_at)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Render upcoming appointments
  renderUpcomingAppointments() {
    const container = document.getElementById('upcoming-appointments-content');
    if (!container) return;

    const upcomingAppointments = this.dashboardData.recentAppointments
      .filter(apt => new Date(apt.appointment_date) >= new Date())
      .slice(0, 3);

    if (upcomingAppointments.length === 0) {
      container.innerHTML = '<div class="empty-state">No upcoming appointments</div>';
      return;
    }

    container.innerHTML = `
      <div class="appointments-list">
        ${upcomingAppointments.map(apt => `
          <div class="appointment-card" data-id="${apt.id}">
            <div class="appointment-date">
              <span class="date">${this.formatDate(apt.appointment_date)}</span>
              <span class="time">${apt.appointment_time}</span>
            </div>
            <div class="appointment-details">
              <div class="doctor-name">Dr. ${apt.doctor_first_name} ${apt.doctor_last_name}</div>
              <div class="appointment-type">${apt.type}</div>
              <div class="appointment-status">
                <span class="status-pill status-${apt.status}">${apt.status}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Render health trends
  renderHealthTrends() {
    const container = document.getElementById('health-trends-content');
    if (!container) return;

    // Group health records by type for trending
    const recordsByType = this.groupHealthRecordsByType();

    container.innerHTML = `
      <div class="charts-container">
        ${Object.keys(recordsByType).map(type => `
          <div class="chart-container" data-type="${type}">
            <div class="chart-title">
              ${this.formatRecordType(type)} Trend
              <span class="chart-live-indicator">Live</span>
            </div>
            <canvas id="chart-${type}" width="300" height="200"></canvas>
          </div>
        `).join('')}
      </div>
    `;

    // Initialize charts
    this.initializeCharts(recordsByType);
  }

  // Render medications
  renderMedications() {
    const container = document.getElementById('medications-content');
    if (!container) return;

    const activeMeds = this.dashboardData.medications.filter(med => med.is_active);

    if (activeMeds.length === 0) {
      container.innerHTML = '<div class="empty-state">No active medications</div>';
      return;
    }

    container.innerHTML = `
      <div class="medications-list">
        ${activeMeds.map(med => `
          <div class="medication-card" data-id="${med.id}">
            <div class="medication-info">
              <div class="medication-name">${med.medication_name}</div>
              <div class="medication-dosage">${med.dosage} - ${med.frequency}</div>
              <div class="medication-instructions">${med.instructions || ''}</div>
            </div>
            <div class="medication-actions">
              <button class="btn btn-sm btn-primary" onclick="dashboard.logMedication(${med.id})">
                Mark Taken
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Real-time update handlers
  handleHealthRecordUpdate(data) {
    console.log('🔄 Health record updated:', data);

    // Update health metrics if visible
    if (document.getElementById('health-overview-content')) {
      this.refreshSection('health-overview');
    }

    // Update charts
    this.updateHealthChart(data);
  }

  handleAppointmentUpdate(data) {
    console.log('🔄 Appointment updated:', data);

    // Refresh appointments section
    this.refreshSection('upcoming-appointments');
    this.refreshSection('todays-appointments');
  }

  handleMessageReceived(data) {
    console.log('📨 New message received:', data);

    // Update message badge
    this.updateMessageBadge();
  }

  // Queue updates to prevent too many rapid refreshes
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

      // Skip old updates (older than 30 seconds)
      if (Date.now() - update.timestamp > 30000) {
        continue;
      }

      await this.processUpdate(update);

      // Small delay to prevent overwhelming the UI
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isUpdating = false;
  }

  async processUpdate(update) {
    try {
      switch (update.section) {
        case 'health-records':
          await this.refreshSection('health-overview');
          break;
        case 'appointments':
          await this.refreshSection('upcoming-appointments');
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

  // Utility methods
  updateRealtimeStatus(status, message) {
    const indicator = document.getElementById('realtime-status');
    if (indicator) {
      indicator.className = `realtime-status ${status}`;
      indicator.innerHTML = `<span>${message}</span>`;
    }
  }

  showOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.classList.add('show');
    }
  }

  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.classList.remove('show');
    }
  }

  showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('show');
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  showError(message) {
    this.api.showNotification({
      title: 'Error',
      message,
      type: 'critical',
      persistent: true
    });
  }

  // Data processing utilities
  getLatestHealthRecords() {
    const recordTypes = ['blood_sugar', 'blood_pressure', 'weight', 'heart_rate', 'temperature'];
    const latest = [];

    recordTypes.forEach(type => {
      const records = this.dashboardData.healthRecords
        ?.filter(r => r.record_type === type)
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

      if (records && records.length > 0) {
        latest.push(records[0]);
      }
    });

    return latest;
  }

  getHealthMetricClass(record) {
    // Determine if the value is critical, warning, or normal
    const { record_type, value } = record;
    const numValue = parseFloat(value);

    switch (record_type) {
      case 'blood_sugar':
        if (numValue > 180 || numValue < 70) return 'critical';
        if (numValue > 140 || numValue < 80) return 'warning';
        return 'normal';

      case 'blood_pressure':
        const [systolic] = value.split('/').map(v => parseInt(v));
        if (systolic > 140) return 'critical';
        if (systolic > 120) return 'warning';
        return 'normal';

      default:
        return 'normal';
    }
  }

  groupHealthRecordsByType() {
    const grouped = {};

    this.dashboardData.healthRecords?.forEach(record => {
      if (!grouped[record.record_type]) {
        grouped[record.record_type] = [];
      }
      grouped[record.record_type].push(record);
    });

    return grouped;
  }

  formatRecordType(type) {
    const types = {
      'blood_sugar': 'Blood Sugar',
      'blood_pressure': 'Blood Pressure',
      'weight': 'Weight',
      'heart_rate': 'Heart Rate',
      'temperature': 'Temperature'
    };
    return types[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  // Initialize charts
  initializeCharts(recordsByType) {
    // This would integrate with Chart.js or similar charting library
    Object.keys(recordsByType).forEach(type => {
      const canvas = document.getElementById(`chart-${type}`);
      if (canvas && window.Chart) {
        this.createChart(canvas, recordsByType[type]);
      }
    });
  }

  // Quick actions
  quickLogHealth() {
    window.location.href = '/log-blood-sugar.html';
  }

  quickBookAppointment() {
    window.location.href = '/request-appointment.html';
  }

  quickAddPatient() {
    // Show add patient modal
    this.showAddPatientModal();
  }

  quickViewSchedule() {
    window.location.href = '/appointments.html';
  }

  // Refresh methods
  async refreshSection(sectionId) {
    console.log(`🔄 Refreshing section: ${sectionId}`);

    try {
      // Show loading state for section
      const content = document.getElementById(`${sectionId}-content`);
      if (content) {
        content.classList.add('loading');
      }

      // Reload specific data based on section
      switch (sectionId) {
        case 'health-overview':
          await this.loadPatientData();
          this.renderHealthMetrics();
          break;
        case 'upcoming-appointments':
        case 'todays-appointments':
          const appointments = await this.api.getPatientAppointments({ limit: 5 });
          this.dashboardData.recentAppointments = appointments.data?.appointments || [];
          this.renderUpcomingAppointments();
          break;
      }

    } catch (error) {
      console.error(`Error refreshing ${sectionId}:`, error);
    } finally {
      const content = document.getElementById(`${sectionId}-content`);
      if (content) {
        content.classList.remove('loading');
      }
    }
  }

  async refreshAllData() {
    console.log('🔄 Refreshing all dashboard data');
    await this.loadDashboardData();
  }

  // Start real-time updates
  startRealTimeUpdates() {
    // Connect to real-time service if not already connected
    if (!this.api.isRealTimeConnected()) {
      this.api.connectRealTime();
    }

    // Set up periodic refresh as backup
    this.refreshInterval = setInterval(() => {
      this.refreshAllData();
    }, 300000); // Every 5 minutes
  }

  // Stop real-time updates
  stopRealTimeUpdates() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Cleanup
  destroy() {
    this.stopRealTimeUpdates();
    this.api.disconnectRealTime();

    // Clear all event listeners
    this.api.removeEventListener('realtime_connected');
    this.api.removeEventListener('realtime_disconnected');
    this.api.removeEventListener('health_record_updated');
    this.api.removeEventListener('appointment_updated');
    this.api.removeEventListener('message_received');

    this.isInitialized = false;
  }
}

// Global dashboard instance
window.dashboard = new EnhancedDashboard();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dashboard.initialize();
  });
} else {
  window.dashboard.initialize();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  window.dashboard.destroy();
});
