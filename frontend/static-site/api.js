// MEDUCO API Integration
// This file handles all API communication with the backend

class MeducoAPI {
    constructor() {
        this.baseURL = 'http://localhost:3001/api/v1';
        this.token = localStorage.getItem('authToken');
    }

    // Helper method to make API requests
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authorization header if token exists
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(email, password, role) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });

            if (response.success) {
                this.token = response.data.token;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('userData', JSON.stringify(response.data.user));
                return response.data;
            }
            throw new Error(response.message);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                this.token = response.data.token;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('userData', JSON.stringify(response.data.user));
                return response.data;
            }
            throw new Error(response.message);
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            if (this.token) {
                await this.request('/auth/logout', { method: 'POST' });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.token = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
        }
    }

    // Patient methods
    async getPatientDashboard() {
        return await this.request('/patients/dashboard');
    }

    async getPatientProfile() {
        return await this.request('/patients/profile');
    }

    async updatePatientProfile(profileData) {
        return await this.request('/patients/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
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
        return await this.request('/patients/medications');
    }

    async getPatientCarePlans() {
        return await this.request('/patients/care-plans');
    }

    // Doctor methods
    async getDoctorDashboard() {
        return await this.request('/doctors/dashboard');
    }

    async getDoctorProfile() {
        return await this.request('/doctors/profile');
    }

    async getDoctorPatients() {
        return await this.request('/doctors/patients');
    }

    // Appointment methods
    async getAppointments(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return await this.request(`/appointments?${queryParams}`);
    }

    async createAppointment(appointmentData) {
        return await this.request('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    }

    async updateAppointment(appointmentId, updateData) {
        return await this.request(`/appointments/${appointmentId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    // Health Records methods
    async getHealthRecords(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return await this.request(`/health-records?${queryParams}`);
    }

    async createHealthRecord(recordData) {
        return await this.request('/health-records', {
            method: 'POST',
            body: JSON.stringify(recordData)
        });
    }

    async updateHealthRecord(recordId, updateData) {
        return await this.request(`/health-records/${recordId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    // Message methods
    async getMessages(type = 'inbox', filters = {}) {
        const queryParams = new URLSearchParams({ type, ...filters });
        return await this.request(`/messages?${queryParams}`);
    }

    async sendMessage(messageData) {
        return await this.request('/messages', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
    }

    async markMessageAsRead(messageId) {
        return await this.request(`/messages/${messageId}/read`, {
            method: 'PUT'
        });
    }

    // Notification methods
    async getNotifications(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return await this.request(`/notifications?${queryParams}`);
    }

    async markNotificationAsRead(notificationId) {
        return await this.request(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
    }

    // Care Plan methods
    async getCarePlans(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return await this.request(`/care-plans?${queryParams}`);
    }

    async getCarePlanTasks(carePlanId) {
        return await this.request(`/care-plans/${carePlanId}/tasks`);
    }

    async updateCarePlanTask(taskId, updateData) {
        return await this.request(`/care-plans/tasks/${taskId}/complete`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    // Medication methods
    async getMedications(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return await this.request(`/medications?${queryParams}`);
    }

    async logMedication(medicationId, logData) {
        return await this.request(`/medications/${medicationId}/log`, {
            method: 'POST',
            body: JSON.stringify(logData)
        });
    }

    // Utility methods
    isAuthenticated() {
        return !!this.token;
    }

    getUserData() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    getUserRole() {
        const userData = this.getUserData();
        return userData ? userData.role : null;
    }

    // Method to handle API errors globally
    handleError(error) {
        if (error.message.includes('Token expired') || error.message.includes('Invalid token')) {
            // Token expired, redirect to login
            this.logout();
            window.location.href = '/login.html';
        } else if (error.message.includes('Insufficient permissions')) {
            alert('You do not have permission to perform this action.');
        } else {
            console.error('API Error:', error);
            alert(`Error: ${error.message}`);
        }
    }
}

// Create global API instance
window.meducoAPI = new MeducoAPI();

// Helper function to show loading state
function showLoading(element) {
    if (element) {
        element.style.opacity = '0.6';
        element.style.pointerEvents = 'none';
    }
}

function hideLoading(element) {
    if (element) {
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
    }
}

// Helper function to format dates
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Helper function to format date for input fields
function formatDateForInput(dateString) {
    return new Date(dateString).toISOString().split('T')[0];
}

// Helper function to format time for input fields
function formatTimeForInput(timeString) {
    return timeString.slice(0, 5); // HH:MM format
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeducoAPI;
}