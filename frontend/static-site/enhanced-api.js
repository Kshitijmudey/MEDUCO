class EnhancedMeducoAPI {
  constructor() {
    this.baseURL = "http://localhost:3001/api/v1";
    this.token = localStorage.getItem("authToken");
    this.userData = JSON.parse(localStorage.getItem("userData")) || null;
    this.eventSource = null;
    this.isRealTimeConnected = false;
    this.eventListeners = new Map();
    this.connectionRetryCount = 0;
    this.maxRetries = 5;
    this.retryTimeout = null;
    this.heartbeatInterval = null;
    this.dataCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.offlineMode = false;
  }

  // Enhanced request method with caching and offline support
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

    // Check cache for GET requests
    const cacheKey = `${endpoint}:${JSON.stringify(options.body || {})}`;
    if (options.method === "GET" || !options.method) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`📦 Using cached data for ${endpoint}`);
        return cached;
      }
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error("Authentication failed");
        }
        const error = new Error(data.message || "API request failed");
        error.response = { data, status: response.status };
        throw error;
      }

      // Cache successful GET responses
      if (options.method === "GET" || !options.method) {
        this.setCache(cacheKey, data);
      }

      this.offlineMode = false;
      return data;
    } catch (error) {
      if (error.message.includes("fetch")) {
        console.warn("🔴 Network error - entering offline mode");
        this.offlineMode = true;
        this.queueRequest(endpoint, options);
      }
      console.error("API Request Error:", error);
      throw error;
    }
  }

  // Cache management
  setCache(key, data) {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  getFromCache(key) {
    const cached = this.dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.dataCache.delete(key);
    return null;
  }

  clearCache() {
    this.dataCache.clear();
  }

  // Request queue management for offline support
  queueRequest(endpoint, options) {
    this.requestQueue.push({ endpoint, options, timestamp: Date.now() });
    if (this.requestQueue.length > 50) {
      this.requestQueue = this.requestQueue.slice(-50); // Keep only last 50 requests
    }
  }

  async processQueuedRequests() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    console.log(`📤 Processing ${this.requestQueue.length} queued requests`);

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      try {
        await this.request(request.endpoint, request.options);
      } catch (error) {
        console.error("Failed to process queued request:", error);
        // Re-queue if it's not too old (within 1 hour)
        if (Date.now() - request.timestamp < 3600000) {
          this.requestQueue.unshift(request);
          break;
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // Enhanced authentication
  async login(email, password, role) {
    try {
      const response = await this.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });

      if (response.success) {
        this.token = response.data.token;
        this.userData = response.data.user;
        localStorage.setItem("authToken", this.token);
        localStorage.setItem("userData", JSON.stringify(this.userData));

        // Connect to real-time updates
        setTimeout(() => this.connectRealTime(), 1000);
        this.triggerEvent("user_login", this.userData);

        return response;
      }
      throw new Error("Login failed");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.token) {
        await this.request("/auth/logout", { method: "POST" });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.token = null;
      this.userData = null;
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      this.disconnectRealTime();
      this.clearCache();
      this.triggerEvent("user_logout", {});
    }
  }

  // Enhanced real-time connection with better error handling
  connectRealTime() {
    if (this.eventSource || !this.token) {
      return;
    }

    console.log("🔄 Establishing real-time connection...");

    try {
      this.eventSource = new EventSource(`${this.baseURL}/realtime/events`, {
        withCredentials: true,
      });

      // Add authorization header (note: EventSource doesn't support custom headers directly)
      // We'll need to pass the token via query parameter or use a different approach

      this.eventSource.onopen = (event) => {
        console.log("✅ Real-time connection established");
        this.isRealTimeConnected = true;
        this.connectionRetryCount = 0;
        this.clearRetryTimeout();
        this.startHeartbeat();
        this.triggerEvent("realtime_connected", { connected: true });

        // Process any queued requests
        this.processQueuedRequests();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📡 Real-time data:", data);
          this.handleRealTimeData(data);
        } catch (error) {
          console.error("Error parsing real-time data:", error);
        }
      };

      this.eventSource.onerror = (event) => {
        console.error("❌ Real-time connection error");
        this.isRealTimeConnected = false;
        this.stopHeartbeat();
        this.triggerEvent("realtime_error", { error: event });
        this.scheduleReconnect();
      };

    } catch (error) {
      console.error("Failed to establish real-time connection:", error);
      this.scheduleReconnect();
    }
  }

  disconnectRealTime() {
    if (this.eventSource) {
      console.log("🛑 Disconnecting real-time updates");
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isRealTimeConnected = false;
    this.stopHeartbeat();
    this.clearRetryTimeout();
    this.triggerEvent("realtime_disconnected", { connected: false });
  }

  scheduleReconnect() {
    if (this.connectionRetryCount >= this.maxRetries) {
      console.error("Max retry attempts reached. Real-time disabled.");
      return;
    }

    this.connectionRetryCount++;
    const delay = Math.min(5000 * Math.pow(2, this.connectionRetryCount - 1), 30000);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.connectionRetryCount}/${this.maxRetries})`);

    this.retryTimeout = setTimeout(() => {
      this.disconnectRealTime();
      this.connectRealTime();
    }, delay);
  }

  clearRetryTimeout() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isRealTimeConnected) {
        // Send a lightweight request to keep connection alive
        this.getRealTimeStats().catch(() => {
          console.log("Heartbeat failed, connection may be lost");
        });
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Enhanced real-time data handling
  handleRealTimeData(data) {
    const { type, payload, timestamp } = data;

    switch (type) {
      case "heartbeat":
        // Connection is alive
        break;

      case "health_record_update":
        this.handleHealthRecordUpdate(payload);
        break;

      case "appointment_update":
        this.handleAppointmentUpdate(payload);
        break;

      case "new_message":
        this.handleNewMessage(payload);
        break;

      case "medication_reminder":
        this.handleMedicationReminder(payload);
        break;

      case "critical_alert":
        this.handleCriticalAlert(payload);
        break;

      case "system_announcement":
        this.handleSystemAnnouncement(payload);
        break;

      case "care_plan_update":
        this.handleCarePlanUpdate(payload);
        break;

      case "notification":
        this.handleNotification(payload);
        break;

      default:
        console.log("Unknown real-time event type:", type);
    }

    // Trigger generic real-time event
    this.triggerEvent("realtime_data", data);
  }

  // Specific real-time handlers
  handleHealthRecordUpdate(payload) {
    this.invalidateCache("health-records");
    this.showNotification({
      title: "Health Record Updated",
      message: `New ${payload.recordType} reading: ${payload.value}`,
      type: payload.isCritical ? "critical" : "info",
    });
    this.triggerEvent("health_record_updated", payload);
  }

  handleAppointmentUpdate(payload) {
    this.invalidateCache("appointments");
    let message = `Appointment ${payload.status}`;
    if (payload.appointmentDate) {
      message += ` for ${new Date(payload.appointmentDate).toLocaleDateString()}`;
    }

    this.showNotification({
      title: "Appointment Update",
      message,
      type: "info",
    });
    this.triggerEvent("appointment_updated", payload);
  }

  handleNewMessage(payload) {
    this.invalidateCache("messages");
    this.showNotification({
      title: `New message from ${payload.senderName}`,
      message: payload.subject || payload.message.substring(0, 50) + "...",
      type: payload.isUrgent ? "urgent" : "info",
    });
    this.triggerEvent("message_received", payload);
    this.updateMessageBadge();
  }

  handleMedicationReminder(payload) {
    this.showNotification({
      title: "Medication Reminder",
      message: `Time to take ${payload.medicationName}`,
      type: "reminder",
      persistent: true,
    });
    this.triggerEvent("medication_reminder", payload);
  }

  handleCriticalAlert(payload) {
    this.showNotification({
      title: "⚠️ Critical Health Alert",
      message: payload.message,
      type: "critical",
      persistent: true,
    });
    this.playAlertSound();
    this.triggerEvent("critical_alert", payload);
  }

  handleSystemAnnouncement(payload) {
    this.showNotification({
      title: "System Announcement",
      message: payload.message,
      type: "announcement",
    });
    this.triggerEvent("system_announcement", payload);
  }

  handleCarePlanUpdate(payload) {
    this.invalidateCache("care-plans");
    this.showNotification({
      title: "Care Plan Updated",
      message: `${payload.planTitle} has been modified`,
      type: "info",
    });
    this.triggerEvent("care_plan_updated", payload);
  }

  handleNotification(payload) {
    this.showNotification(payload);
    this.triggerEvent("notification_received", payload);
  }

  // Enhanced notification system
  showNotification({ title, message, type = "info", persistent = false }) {
    // Browser notification if permission granted
    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body: message,
        icon: "/favicon.ico",
        tag: `meduco-${type}`,
      });

      if (!persistent) {
        setTimeout(() => notification.close(), 5000);
      }
    }

    // In-app notification
    this.createInAppNotification({ title, message, type, persistent });
  }

  createInAppNotification({ title, message, type, persistent }) {
    const container = this.getNotificationContainer();

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close">&times;</button>
      </div>
    `;

    const closeBtn = notification.querySelector(".notification-close");
    closeBtn.onclick = () => notification.remove();

    container.appendChild(notification);

    // Auto-remove if not persistent
    if (!persistent) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.opacity = "0";
          setTimeout(() => notification.remove(), 300);
        }
      }, 5000);
    }

    // Animate in
    setTimeout(() => notification.classList.add("show"), 100);
  }

  getNotificationContainer() {
    let container = document.getElementById("notification-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "notification-container";
      container.className = "notification-container";
      document.body.appendChild(container);
    }
    return container;
  }

  playAlertSound() {
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeAyCG2vy3biMFl7jxnGkwBR4PJCGMJxDYDAoBAAoMIiFOCRwLgKLRvfKMJCEGaK");
      audio.play().catch(() => console.log("Could not play alert sound"));
    } catch (error) {
      console.log("Alert sound not available");
    }
  }

  // Cache invalidation
  invalidateCache(pattern) {
    for (const key of this.dataCache.keys()) {
      if (key.includes(pattern)) {
        this.dataCache.delete(key);
      }
    }
  }

  // Enhanced event system
  addEventListener(event, callback, options = {}) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    const listener = { callback, options };
    this.eventListeners.get(event).add(listener);

    return () => this.eventListeners.get(event)?.delete(listener);
  }

  removeEventListener(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        if (listener.callback === callback) {
          listeners.delete(listener);
          break;
        }
      }
    }
  }

  triggerEvent(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener.callback(data);

          // Remove one-time listeners
          if (listener.options.once) {
            listeners.delete(listener);
          }
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  // Utility methods
  updateMessageBadge() {
    const badge = document.querySelector(".message-badge");
    if (badge) {
      this.getUnreadMessageCount().then(count => {
        badge.textContent = count > 99 ? "99+" : count.toString();
        badge.style.display = count > 0 ? "block" : "none";
      });
    }
  }

  async getUnreadMessageCount() {
    try {
      const response = await this.request("/messages?unread=true");
      return response.data?.messages?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  // Request browser notification permission
  async requestNotificationPermission() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  // API Methods - Enhanced with better error handling and caching

  // Authentication
  async register(userData) {
    const response = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return response;
  }

  // Patient APIs
  async getPatientDashboard() {
    return this.request("/patients/dashboard");
  }

  async getPatientProfile() {
    return this.request("/patients/profile");
  }

  async updatePatientProfile(data) {
    this.invalidateCache("patients/profile");
    return this.request("/patients/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getPatientAppointments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/patients/appointments${queryString ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }

  async getPatientHealthRecords(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/patients/health-records${queryString ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }

  async createHealthRecord(data) {
    this.invalidateCache("health-records");
    return this.request("/health-records", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPatientMedications() {
    return this.request("/patients/medications");
  }

  async getPatientCarePlans() {
    return this.request("/patients/care-plans");
  }

  // Doctor APIs
  async getDoctorDashboard() {
    return this.request("/doctors/dashboard");
  }

  async getDoctorProfile() {
    return this.request("/doctors/profile");
  }

  async getDoctorPatients(searchTerm = "") {
    const endpoint = `/doctors/patients${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`;
    return this.request(endpoint);
  }

  async createPatient(data) {
    this.invalidateCache("doctors/patients");
    return this.request("/doctors/patients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Appointment APIs
  async getAppointments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/appointments${queryString ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }

  async createAppointment(data) {
    this.invalidateCache("appointments");
    return this.request("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(id, data) {
    this.invalidateCache("appointments");
    return this.request(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getDoctors() {
    return this.request("/appointments/doctors");
  }

  async getDoctorAvailability(doctorId) {
    return this.request(`/appointments/doctors/${doctorId}/availability`);
  }

  async getDoctorSlots(doctorId, date) {
    return this.request(`/appointments/doctors/${doctorId}/slots?date=${date}`);
  }

  // Message APIs
  async getMessages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/messages${queryString ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }

  async sendMessage(data) {
    this.invalidateCache("messages");
    return this.request("/messages", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async markMessageAsRead(messageId) {
    this.invalidateCache("messages");
    return this.request(`/messages/${messageId}/read`, {
      method: "PUT",
    });
  }

  // Notification APIs
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/notifications${queryString ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }

  async markNotificationAsRead(notificationId) {
    this.invalidateCache("notifications");
    return this.request(`/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  }

  // Care Plan APIs
  async getCarePlans(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/care-plans${queryString ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }

  async getCarePlanTasks(carePlanId) {
    return this.request(`/care-plans/${carePlanId}/tasks`);
  }

  async updateCarePlanTask(taskId, data) {
    this.invalidateCache("care-plans");
    return this.request(`/care-plans/tasks/${taskId}/complete`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Medication APIs
  async getMedications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/medications${queryString ? `?${queryString}` : ""}`;
    return this.request(endpoint);
  }

  async logMedication(medicationId, data) {
    this.invalidateCache("medications");
    return this.request(`/medications/${medicationId}/log`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Real-time API
  async getRealTimeStats() {
    return this.request("/realtime/stats");
  }

  // Utility methods
  isAuthenticated() {
    return !!this.token && !!this.userData;
  }

  getUserData() {
    return this.userData;
  }

  getUserRole() {
    return this.userData?.role;
  }

  isOffline() {
    return this.offlineMode;
  }

  isRealTimeConnected() {
    return this.isRealTimeConnected;
  }

  // Initialize the API
  async initialize() {
    // Request notification permission
    await this.requestNotificationPermission();

    // Auto-connect if already authenticated
    if (this.isAuthenticated()) {
      setTimeout(() => this.connectRealTime(), 1000);
    }

    // Listen for online/offline events
    window.addEventListener("online", () => {
      console.log("🟢 Back online");
      this.offlineMode = false;
      this.connectRealTime();
      this.processQueuedRequests();
    });

    window.addEventListener("offline", () => {
      console.log("🔴 Gone offline");
      this.offlineMode = true;
      this.disconnectRealTime();
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.disconnectRealTime();
    });
  }
}

// Create global instance
window.meducoAPI = new EnhancedMeducoAPI();

// Initialize when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.meducoAPI.initialize();
  });
} else {
  window.meducoAPI.initialize();
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = EnhancedMeducoAPI;
}
