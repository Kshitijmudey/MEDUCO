class MeducoAPI {
  constructor() {
    this.baseURL = "http://localhost:3001/api/v1";
    this.token = localStorage.getItem("authToken");
    this.eventSource = null;
    this.isRealTimeConnected = false;
    this.eventListeners = new Map();
    this.connectionRetryCount = 0;
    this.maxRetries = 5;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || "API request failed");
        error.response = { data };
        throw error;
      }

      return data;
    } catch (error) {
      console.error("API Request Error:", error);
      throw error;
    }
  }

  async login(email, password, role) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });

    if (response.success) {
      this.token = response.data.token;
      localStorage.setItem("authToken", this.token);
      localStorage.setItem("userData", JSON.stringify(response.data.user));
      return response.data;
    }
    throw new Error(response.message);
  }

  // Real-time connection methods
  connectRealTime() {
    if (this.eventSource || !this.token) {
      return;
    }

    console.log("🔄 Connecting to real-time updates...");

    const eventSourceURL = `${this.baseURL}/realtime/events`;
    this.eventSource = new EventSource(eventSourceURL, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    this.eventSource.onopen = (event) => {
      console.log("✅ Real-time connection established");
      this.isRealTimeConnected = true;
      this.connectionRetryCount = 0;
      this.triggerEvent("connection_established", { connected: true });
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📡 Real-time data received:", data);
        this.handleRealTimeData(data);
      } catch (error) {
        console.error("Error parsing real-time data:", error);
      }
    };

    this.eventSource.onerror = (event) => {
      console.error("❌ Real-time connection error:", event);
      this.isRealTimeConnected = false;
      this.triggerEvent("connection_error", { error: event });

      // Attempt to reconnect
      if (this.connectionRetryCount < this.maxRetries) {
        this.connectionRetryCount++;
        console.log(
          `🔄 Attempting to reconnect (${this.connectionRetryCount}/${this.maxRetries})...`,
        );
        setTimeout(() => {
          this.disconnectRealTime();
          this.connectRealTime();
        }, 5000 * this.connectionRetryCount); // Exponential backoff
      }
    };

    return this.eventSource;
  }

  disconnectRealTime() {
    if (this.eventSource) {
      console.log("🛑 Disconnecting real-time updates...");
      this.eventSource.close();
      this.eventSource = null;
      this.isRealTimeConnected = false;
      this.triggerEvent("connection_closed", { connected: false });
    }
  }

  handleRealTimeData(data) {
    const { type, timestamp, data: eventData, priority } = data;

    switch (type) {
      case "connection_established":
        this.showNotification("Connected to real-time updates", "success");
        break;

      case "health_record_updated":
        this.handleHealthRecordUpdate(eventData);
        break;

      case "patient_health_record_updated":
        this.handlePatientHealthRecordUpdate(eventData);
        break;

      case "critical_health_alert":
        this.handleCriticalHealthAlert(eventData);
        break;

      case "appointment_updated":
      case "appointment_created":
      case "appointment_cancelled":
        this.handleAppointmentUpdate(eventData, type);
        break;

      case "new_message":
        this.handleNewMessage(eventData);
        break;

      case "medication_reminder":
        this.handleMedicationReminder(eventData);
        break;

      case "system_announcement":
        this.handleSystemAnnouncement(eventData, priority);
        break;

      case "heartbeat":
        // Keep connection alive
        break;

      default:
        console.log("Unhandled real-time event:", type, eventData);
        this.triggerEvent(type, eventData);
    }

    // Trigger general event for any listeners
    this.triggerEvent("realtime_data", { type, data: eventData, timestamp });
  }

  // Event handling methods
  handleHealthRecordUpdate(data) {
    this.showNotification("New health record added", "info");
    this.triggerEvent("health_record_updated", data);

    // Update dashboard if visible
    this.refreshDashboardData();
  }

  handlePatientHealthRecordUpdate(data) {
    this.showNotification(`New health record for ${data.patientName}`, "info");
    this.triggerEvent("patient_health_record_updated", data);

    // Update patient list if visible
    this.refreshPatientData();
  }

  handleCriticalHealthAlert(data) {
    this.showNotification(data.message, "error", 10000); // Show for 10 seconds
    this.triggerEvent("critical_health_alert", data);

    // Play alert sound if possible
    this.playAlertSound();
  }

  handleAppointmentUpdate(data, type) {
    const action = type.replace("appointment_", "");
    this.showNotification(
      `Appointment ${action}: ${data.doctorName || data.patientName}`,
      "info",
    );
    this.triggerEvent("appointment_updated", { ...data, action });

    // Refresh calendar/appointments
    this.refreshAppointmentData();
  }

  handleNewMessage(data) {
    this.showNotification(`New message from ${data.senderRole}`, "info");
    this.triggerEvent("new_message", data);

    // Update message count
    this.updateMessageCount();
  }

  handleMedicationReminder(data) {
    this.showNotification(`⏰ ${data.message}`, "warning", 30000); // Show for 30 seconds
    this.triggerEvent("medication_reminder", data);
  }

  handleSystemAnnouncement(data, priority) {
    const duration = priority === "high" ? 15000 : 8000;
    this.showNotification(
      `📢 ${data.message}`,
      priority === "high" ? "warning" : "info",
      duration,
    );
    this.triggerEvent("system_announcement", data);
  }

  // Utility methods
  showNotification(message, type = "info", duration = 5000) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

    // Add to page
    let container = document.getElementById("notification-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "notification-container";
      container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
      document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
  }

  playAlertSound() {
    try {
      // Create audio element for critical alerts
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+CRZiturqpVITC0ml4PK8aB4KI4nU8tGAMQYfcsLu45ZODAxTpOXwtGQdBjiS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+CRZiturqpVITC0ml4PK8aB4KI4nU8tGAMQYfcsLu45ZODAxTpOXwtGQdBjiS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+CRZiturqpVITC0ml4PK8aB4KI4nU8tGAMQYfcsLu45ZODAxTpOXwtGQdBjiS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+CRZiturqpVITC0ml4PK8aB4KI4nU8tGAMQYfcsLu45ZODAxTpOXwtGQdBjiS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+CRZiturqpVITC0ml4PK8aB4KI4nU8tGAMQYfcsLu45ZODAxTpOXwtGQdBjiS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+CRZiturqpVITC0ml4PK8aB4KI4nU8tGAMQYfcsLu45ZODAxTpOXwtGQdBjiS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+CRZiturqpVITC0ml4PK8aB4KI4nU8tGAMQYfcsLu45ZODAxTpOXwtGQdBjiS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+CRZiturqpVITC0ml4PK8aB4KI4nU8tGAMQYfcsLu45ZODAxTpOXwtGQdBjiS1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeCSGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OecTgwOUarm98BuJAUme8rx2I4+",
      );
      audio.play().catch((e) => console.log("Could not play alert sound"));
    } catch (error) {
      console.log("Alert sound not available");
    }
  }

  // Event listener management
  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }

  removeEventListener(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  triggerEvent(eventType, data) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in event listener:", error);
        }
      });
    }
  }

  // Dashboard refresh methods
  refreshDashboardData() {
    const event = new CustomEvent("refreshDashboard");
    window.dispatchEvent(event);
  }

  refreshPatientData() {
    const event = new CustomEvent("refreshPatients");
    window.dispatchEvent(event);
  }

  refreshAppointmentData() {
    const event = new CustomEvent("refreshAppointments");
    window.dispatchEvent(event);
  }

  updateMessageCount() {
    // Update message notification badge
    this.getUnreadMessagesCount().then((count) => {
      const badge = document.querySelector(".message-badge");
      if (badge) {
        badge.textContent = count > 0 ? count : "";
        badge.style.display = count > 0 ? "inline" : "none";
      }
    });
  }

  // API methods for real-time service
  async getRealTimeStats() {
    return this.request("/realtime/stats");
  }

  async sendSystemAnnouncement(message, priority = "medium") {
    return this.request("/realtime/announcement", {
      method: "POST",
      body: JSON.stringify({ message, priority }),
    });
  }

  async getConnectionStatus() {
    return this.request("/realtime/connections");
  }

  async sendTestNotification(type, data, targetUserId) {
    return this.request("/realtime/test-notification", {
      method: "POST",
      body: JSON.stringify({ type, data, targetUserId }),
    });
  }

  // Enhanced logout to disconnect real-time
  async logout() {
    try {
      this.disconnectRealTime();
      await this.request("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.token = null;
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
    }
  }

  // Auto-connect real-time after login
  async login(email, password, role) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });

    if (response.success) {
      this.token = response.data.token;
      localStorage.setItem("authToken", this.token);
      localStorage.setItem("userData", JSON.stringify(response.data.user));

      // Auto-connect to real-time updates
      setTimeout(() => {
        this.connectRealTime();
      }, 1000);

      return response.data;
    }
    throw new Error(response.message);
  }

  async register(userData) {
    const response = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.success) {
      this.token = response.data.token;
      localStorage.setItem("authToken", this.token);
      localStorage.setItem("userData", JSON.stringify(response.data.user));
      return response.data;
    }
    throw new Error(response.message);
  }

  async logout() {
    if (this.token) {
      await this.request("/auth/logout", { method: "POST" });
    }
    this.token = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
  }

  async getPatientDashboard() {
    return await this.request("/patients/dashboard");
  }

  async getPatientProfile() {
    return await this.request("/patients/profile");
  }

  async updatePatientProfile(profileData) {
    return await this.request("/patients/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async getPatientAppointments(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    return await this.request(`/patients/appointments?${queryParams}`);
  }

  async getPatientHealthRecords(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    return await this.request(`/patients/health-records?${queryParams}`);
  }

  async getPatientMedications() {
    return await this.request("/patients/medications");
  }

  async getPatientCarePlans() {
    return await this.request("/patients/care-plans");
  }

  async getDoctorDashboard() {
    return await this.request("/doctors/dashboard");
  }

  async getDoctorProfile() {
    return await this.request("/doctors/profile");
  }

  async getDoctorPatients() {
    return await this.request("/doctors/patients");
  }

  async createPatient(patientData) {
    return await this.request("/doctors/patients", {
      method: "POST",
      body: JSON.stringify(patientData),
    });
  }

  async getAppointments(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    return await this.request(`/appointments?${queryParams}`);
  }

  async createAppointment(appointmentData) {
    return await this.request("/appointments", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    });
  }

  async updateAppointment(appointmentId, updateData) {
    return await this.request(`/appointments/${appointmentId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async getHealthRecords(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    return await this.request(`/health-records?${queryParams}`);
  }

  async createHealthRecord(recordData) {
    return await this.request("/health-records", {
      method: "POST",
      body: JSON.stringify(recordData),
    });
  }

  async updateHealthRecord(recordId, updateData) {
    return await this.request(`/health-records/${recordId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async getMessages(type = "inbox", filters = {}) {
    const queryParams = new URLSearchParams({ type, ...filters });
    return await this.request(`/messages?${queryParams}`);
  }

  async sendMessage(messageData) {
    return await this.request("/messages", {
      method: "POST",
      body: JSON.stringify(messageData),
    });
  }

  async markMessageAsRead(messageId) {
    return await this.request(`/messages/${messageId}/read`, {
      method: "PUT",
    });
  }

  async getNotifications(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    return await this.request(`/notifications?${queryParams}`);
  }

  async markNotificationAsRead(notificationId) {
    return await this.request(`/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  }

  async getCarePlans(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    return await this.request(`/care-plans?${queryParams}`);
  }

  async getCarePlanTasks(carePlanId) {
    return await this.request(`/care-plans/${carePlanId}/tasks`);
  }

  async updateCarePlanTask(taskId, updateData) {
    return await this.request(`/care-plans/tasks/${taskId}/complete`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async getMedications(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    return await this.request(`/medications?${queryParams}`);
  }

  async logMedication(medicationId, logData) {
    return await this.request(`/medications/${medicationId}/log`, {
      method: "POST",
      body: JSON.stringify(logData),
    });
  }

  isAuthenticated() {
    return !!this.token;
  }

  getUserData() {
    const userData = localStorage.getItem("userData");
    return userData ? JSON.parse(userData) : null;
  }

  getUserRole() {
    const userData = this.getUserData();
    return userData ? userData.role : null;
  }

  async getDoctors() {
    try {
      const response = await this.request("/appointments/doctors");
      return response.data.doctors;
    } catch (error) {
      console.error("Get doctors error:", error);
      throw error;
    }
  }

  async getDoctorAvailability(doctorId) {
    try {
      const response = await this.request(
        `/appointments/doctors/${doctorId}/availability`,
      );
      return response.data.availability;
    } catch (error) {
      console.error("Get doctor availability error:", error);
      throw error;
    }
  }

  async getDoctorSlots(doctorId, date) {
    try {
      const response = await this.request(
        `/appointments/doctors/${doctorId}/slots?date=${date}`,
      );
      return response.data.slots;
    } catch (error) {
      console.error("Get doctor slots error:", error);
      throw error;
    }
  }
}

window.meducoAPI = new MeducoAPI();
