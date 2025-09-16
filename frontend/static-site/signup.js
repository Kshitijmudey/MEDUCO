// Signup page specific functionality
(function() {
    'use strict';

    // Initialize signup page elements
    const roleTabs = document.getElementById('roleTabs');
    const roleInput = document.getElementById('roleInput');
    const signupForm = document.getElementById('signupForm');
    const signupNote = document.getElementById('signupNote');

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

    // Enhanced role switching for signup
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
                if (signupForm) {
                    signupForm.style.animation = 'pulse 0.3s ease';
                    setTimeout(() => {
                        signupForm.style.animation = '';
                    }, 300);
                }

                console.log('Role switched to:', role);
            });
        });

        // Set initial active role tab based on hidden input value
        const initialRole = roleInput.value || 'patient';
        updateRoleTabs(initialRole);
    }

    // Enhanced signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(signupForm);
            const role = String(data.get('role') || 'patient');
            const fullName = String(data.get('fullName') || '');
            const email = String(data.get('email') || '');
            const phone = String(data.get('phone') || '');
            const password = String(data.get('password') || '');
            const confirm = String(data.get('confirm') || '');
            const submitBtn = signupForm.querySelector('#submitBtn');

            // Validate phone number format
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
                if (signupNote) {
                    signupNote.innerHTML = `
                        <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; border: 2px solid #ef4444; margin-top: 16px;">
                            <p style="margin: 0; color: #dc2626; font-weight: 600;">❌ Please enter a valid phone number!</p>
                        </div>
                    `;
                    signupNote.style.animation = 'fadeInUp 0.6s ease';
                }
                return;
            }

            // Validate password strength
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
            if (!passwordRegex.test(password)) {
                if (signupNote) {
                    signupNote.innerHTML = `
                        <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; border: 2px solid #ef4444; margin-top: 16px;">
                            <p style="margin: 0; color: #dc2626; font-weight: 600;">❌ Password must contain at least one uppercase letter, one lowercase letter, and one number!</p>
                        </div>
                    `;
                    signupNote.style.animation = 'fadeInUp 0.6s ease';
                }
                return;
            }

            // Validate password confirmation
            if (password !== confirm) {
                if (signupNote) {
                    signupNote.innerHTML = `
                        <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; border: 2px solid #ef4444; margin-top: 16px;">
                            <p style="margin: 0; color: #dc2626; font-weight: 600;">❌ Passwords do not match!</p>
                        </div>
                    `;
                    signupNote.style.animation = 'fadeInUp 0.6s ease';
                }
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                if (signupNote) {
                    signupNote.innerHTML = `
                        <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; border: 2px solid #ef4444; margin-top: 16px;">
                            <p style="margin: 0; color: #dc2626; font-weight: 600;">❌ Please enter a valid email address!</p>
                        </div>
                    `;
                    signupNote.style.animation = 'fadeInUp 0.6s ease';
                }
                return;
            }

            // Enhanced loading state
            if (submitBtn) {
                submitBtn.textContent = 'Creating account...';
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.7';
            }

            try {
                // Parse full name
                const nameParts = fullName.trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                // Use real API for registration
                const response = await window.meducoAPI.register({
                    email,
                    password,
                    role,
                    firstName,
                    lastName,
                    phone
                });

                const userIdField = role === 'patient' ? response.user.patientId : response.user.doctorId;
                const displayName = role === 'doctor' ? `Dr. ${fullName}` : fullName;

                if (signupNote) {
                    signupNote.innerHTML = `
                        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; border: 2px solid #0ea5e9; margin-top: 20px; box-shadow: 0 10px 25px rgba(14, 165, 233, 0.1);">
                            <h4 style="margin: 0 0 12px; color: #0ea5e9; font-size: 20px;">${role === 'doctor' ? '👨‍⚕️' : '🎉'} Welcome, ${displayName}!</h4>
                            ${role === 'patient' ? `<p style="margin: 0 0 16px; color: #0ea5e9; font-size: 16px;">Your Patient ID: <strong style="font-size: 22px; background: linear-gradient(135deg, #0ea5e9, #0284c7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${userIdField}</strong></p>` : ''}
                            <p style="margin: 0; font-size: 14px; color: #64748b;">${role === 'patient' ? 'Please save this ID. ' : ''}Redirecting to dashboard...</p>
                            <div style="margin-top: 16px;">
                                <div style="width: 100%; height: 4px; background: #e0f2fe; border-radius: 2px; overflow: hidden;">
                                    <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #0ea5e9, #0284c7); border-radius: 2px; animation: progressBar 3s linear forwards;"></div>
                                </div>
                            </div>
                        </div>
                    `;
                    signupNote.style.animation = 'fadeInUp 0.6s ease';
                }

                // Store additional data for compatibility
                if (role === 'patient') {
                    localStorage.setItem('patientID', userIdField);
                    localStorage.setItem('patientName', fullName);
                } else if (role === 'doctor') {
                    localStorage.setItem('doctorName', fullName);
                }

                const dest = role === 'doctor' ? 'doctor-dashboard.html' : 'patient-dashboard.html';
                setTimeout(() => {
                    window.location.href = dest;
                }, 3000);

            } catch (error) {
                console.error('Registration failed:', error);
                if (signupNote) {
                    let errorMessage = error.message || 'Registration failed. Please try again.';

                    // Display detailed validation errors if available
                    if (error.response && error.response.data && error.response.data.errors && Array.isArray(error.response.data.errors)) {
                        const errorList = error.response.data.errors.map(err => `<li>${err.msg}</li>`).join('');
                        errorMessage = `<div>❌ Validation failed:</div><ul style="text-align: left; margin: 8px 0 0 20px;">${errorList}</ul>`;
                    }

                    signupNote.innerHTML = `
                        <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; border: 2px solid #ef4444; margin-top: 16px;">
                            <p style="margin: 0; color: #dc2626; font-weight: 600;">${errorMessage}</p>
                        </div>
                    `;
                    signupNote.style.animation = 'fadeInUp 0.6s ease';
                }
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.textContent = 'Sign Up';
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }
            }
        });
    }

    // Password toggle functionality for signup
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
