document.addEventListener('DOMContentLoaded', function() {
    const addUserForm = document.getElementById('addUserForm');
    const usersList = document.getElementById('usersList');
    const logoutBtn = document.getElementById('logoutBtn');

    // Load users
    function loadUsers() {
        fetch('/users')
            .then(response => {
                if (response.status === 403) {
                    window.location.href = '/index.html';
                    return;
                }
                return response.json();
            })
            .then(users => {
                if (users) {
                    displayUsers(users);
                }
            })
            .catch(error => console.error('Error:', error));
    }

    // Display users
    function displayUsers(users) {
        usersList.innerHTML = '';
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <span>${user.username} (${user.role})</span>
                ${user.username !== 'admin' ? 
                    `<button class="delete-user" data-username="${user.username}">Delete</button>` : 
                    ''}
            `;
            usersList.appendChild(userItem);
        });
    }

    // Add new user
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;

        try {
            const response = await fetch('/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, role })
            });

            if (response.ok) {
                addUserForm.reset();
                loadUsers();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to add user');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Delete user
    usersList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-user')) {
            const username = e.target.dataset.username;
            if (confirm(`Are you sure you want to delete user "${username}"?`)) {
                try {
                    const response = await fetch(`/users/${username}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        loadUsers();
                    } else {
                        const data = await response.json();
                        alert(data.error || 'Failed to delete user');
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Initial load
    loadUsers();

    // File Upload Handling
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');

    // Trigger file input when clicking the browse button
    document.querySelector('.browse-button').addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', handleFiles);

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles({ target: { files: e.dataTransfer.files } });
    });

    function handleFiles(e) {
        const files = Array.from(e.target.files);
        fileList.innerHTML = '';
        
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name}</span>
                <span class="remove-file">×</span>
            `;
            fileList.appendChild(fileItem);
        });
    }

    // Handle form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = fileInput.files;
        if (!files.length) return;

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                alert('Files uploaded successfully');
                fileList.innerHTML = '';
                fileInput.value = '';
                
                // Refresh the gallery page if it exists
                if (window.opener && !window.opener.closed) {
                    window.opener.location.reload();
                }
            } else {
                alert(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        }
    });

    // Remove file from list
    fileList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-file')) {
            e.target.parentElement.remove();
        }
    });
}); 