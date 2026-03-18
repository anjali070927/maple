document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleIcon = document.getElementById('toggleIcon');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const submitBtn = document.getElementById('loginBtn');

    const inputs = [usernameInput, passwordInput];

    // Password Visibility Toggle Logic
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Toggle FontAwesome classes for the eye icon
        if (type === 'password') {
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        } else {
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        }
    });

    // Remove error highlights when user types
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                input.classList.remove('invalid');
                if (!errorMessage.classList.contains('hidden')) {
                    hideError();
                }
            });
        }
    });

    // Form validation and submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload

        // Reset previous errors
        hideError();
        inputs.forEach(input => input.classList.remove('invalid'));

        // Fetch values
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // 1. Validation Logic
        let isValid = true;
        let authError = '';
        let targetField = null;

        if (!username) {
            isValid = false;
            authError = 'Please enter your User ID.';
            targetField = usernameInput;
        } else if (!password) {
            isValid = false;
            authError = 'Please enter your password.';
            targetField = passwordInput;
        }

        // 2. Handle Validation Failure
        if (!isValid) {
            targetField.classList.add('invalid');
            showError(authError);
            targetField.focus();
            return;
        }

        // 3. Actual Backend Login
        submitBtn.classList.add('loading');
        const btnSpan = submitBtn.querySelector('span');
        const originalText = btnSpan.textContent;
        btnSpan.textContent = 'Verifying...';

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            submitBtn.classList.remove('loading');
            btnSpan.textContent = originalText;

            if (data.error) {
                usernameInput.classList.add('invalid');
                passwordInput.classList.add('invalid');
                showError(data.error);
                usernameInput.focus();
            } else if (data.user) {
                // Success
                sessionStorage.setItem('maple_user', JSON.stringify(data.user));
                if (data.user.role === 'Admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            } else {
                showError('Unexpected response from server.');
            }
        })
        .catch(err => {
            submitBtn.classList.remove('loading');
            btnSpan.textContent = originalText;
            showError('Server connection failed. Make sure the backend is running.');
            console.error('Login error:', err);
        });
    });

    // Helper functions for displaying errors
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');

        // Trigger CSS shake animation by resetting the element
        errorMessage.style.animation = 'none';
        errorMessage.offsetHeight; /* trigger reflow */
        errorMessage.style.animation = null;
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }
});


