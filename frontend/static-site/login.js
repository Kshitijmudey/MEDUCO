// Login page specific functionality
(function() {
    'use strict';

    // Initialize login page elements
    const roleTabs = document.getElementById('roleTabs');
    const roleInput = document.getElementById('roleInput');
    const loginForm = document.getElementById('loginForm');
    const loginNote = document.getElementById('loginNote');

    // Function to update role tabs visual state
    function updateRoleTabs(activeRole) {
        if (!roleTabs) return;

        const buttons = roleTabs.querySelectorAll('[data-role]');
        buttons.forEach(btn => {
            const btnRole = btn.getAttribute('data-role');
            if (btnRole === activeRole) {
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-outline');
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline');
                btn.style.transform = 'scale(0.95)';
            }
        });
    }

    // Enhanced role switching for login
    if (roleTabs && roleInput) {
        const buttons = roleTabs.querySelectorAll('[data-role]');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const role = btn.getAttribute('data-role');
                if (!role) return;

                // Update hidden input value
                roleInput.value = role;

                // Update visual state
                updateRoleTabs(role);

                // Add subtle animation to form
                if (loginForm) {
                    loginForm.style.animation = 'pulse 0.3s ease';
                    setTimeout(() => {
                        loginForm.style.animation = '';
                    }, 300);
                }

                console.log('Role switched to:', role);
            });
        });

        // Set initial active role tab based on hidden input value
        const initialRole = roleInput.value || 'patient';
        updateRoleTabs(initialRole);
    }

    // Enhanced login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(loginForm);
            const email = String(data.get('email') || '');
            const password = String(data.get('password') || '');
            const role = String(data.get('role') || 'patient');
            const submitBtn = loginForm.querySelector('#submitBtn');

            console.log('Login attempt with role:', role, 'email:', email);

            // Enhanced loading state
            if (submitBtn) {
                submitBtn.textContent = 'Signing in...';
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.7';
            }

            try {
                // Use real API for login
                const response = await window.meducoAPI.login(email, password, role);

                console.log('Login response user role:', response.user ? response.user.role : 'no user role');

                if (loginNote) {
                    loginNote.innerHTML = `
                        <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; border: 2px solid #10b981; margin-top: 16px;">
                            <p style="margin: 0; color: #059669; font-weight: 600;">✅ Signed in successfully. Redirecting...</p>
                        </div>
                    `;
                    loginNote.style.animation = 'fadeInUp 0.6s ease';
                }

                // Store additional data for compatibility
                if (role === 'patient' && response.user.profile) {
                    localStorage.setItem('patientName', `${response.user.profile.first_name} ${response.user.profile.last_name}`);
                    localStorage.setItem('patientID', response.user.profile.patient_id);
                } else if (role === 'doctor' && response.user.profile) {
                    localStorage.setItem('doctorName', `${response.user.profile.first_name} ${response.user.profile.last_name}`);
                }

                // Fix redirect based on role from response user data
                let dest = 'index.html';
                if (response.user && response.user.role) {
                    dest = response.user.role === 'doctor' ? 'doctor-dashboard.html' : 'patient-dashboard.html';
                } else {
                    dest = role === 'doctor' ? 'doctor-dashboard.html' : 'patient-dashboard.html';
                }
                console.log('Redirecting to:', dest);
                setTimeout(() => { window.location.href = dest; }, 1500);

            } catch (error) {
                console.error('Login failed:', error);
                if (loginNote) {
                    loginNote.innerHTML = `
                        <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; border: 2px solid #ef4444; margin-top: 16px;">
                            <p style="margin: 0; color: #dc2626; font-weight: 600;">❌ ${error.message || 'Login failed. Please try again.'}</p>
                        </div>
                    `;
                    loginNote.style.animation = 'fadeInUp 0.6s ease';
                }
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.textContent = 'Sign In';
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }
            }
        });
    }

    // Password toggle functionality for login
    window.togglePassword = function(fieldName) {
        const passwordField = document.querySelector(`input[name="${fieldName}"]`);
        const iconElement = document.getElementById(`${fieldName}-icon`);

        if (passwordField && iconElement) {
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                iconElement.textContent = '🙉';
                iconElement.setAttribute('aria-label', 'Hide password');
            } else {
                passwordField.type = 'password';
                iconElement.textContent = '👁️';
                iconElement.setAttribute('aria-label', 'Show password');
            }

            // Add subtle animation
            iconElement.style.transform = 'scale(0.8)';
            setTimeout(() => {
                iconElement.style.transform = 'scale(1)';
            }, 150);
        }
    };

})();
