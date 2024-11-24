document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = ''; // Clear previous errors
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            errorMessage.textContent = 'Please enter both username and password';
            return;
        }

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Login failed');
            }

            const data = await response.json();

            if (data.success) {
                if (data.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/index.html';
                }
            } else {
                errorMessage.textContent = 'Invalid credentials';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message || 'Login failed. Please try again.';
        }
    });
}); 