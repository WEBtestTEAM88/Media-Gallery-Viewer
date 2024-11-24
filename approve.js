document.addEventListener('DOMContentLoaded', function() {
    const pendingFiles = document.getElementById('pendingFiles');
    const logoutBtn = document.getElementById('logoutBtn');

    function updatePendingCount(count) {
        const pendingCount = document.getElementById('pendingCount');
        pendingCount.textContent = `Pending Files: ${count}`;
    }

    function loadPendingFiles() {
        const pendingFiles = document.getElementById('pendingFiles');
        const noFiles = document.getElementById('noFiles');
        
        pendingFiles.innerHTML = '<div class="loading-spinner"></div>';

        fetch('/pending-files')
            .then(response => response.json())
            .then(files => {
                pendingFiles.innerHTML = '';
                updatePendingCount(files.length);

                if (files.length === 0) {
                    noFiles.style.display = 'block';
                    pendingFiles.style.display = 'none';
                } else {
                    noFiles.style.display = 'none';
                    pendingFiles.style.display = 'grid';
                    files.forEach(file => {
                        const itemElement = createPendingItem(file);
                        pendingFiles.appendChild(itemElement);
                    });
                }
            })
            .catch(error => {
                console.error('Error loading pending files:', error);
                pendingFiles.innerHTML = '<div class="error-message">Failed to load pending files</div>';
            });
    }

    function createPendingItem(file) {
        const item = document.createElement('div');
        item.className = 'pending-item';
        
        const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(file.type.toLowerCase());
        const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(file.type.toLowerCase());
        const fileType = isImage ? 'Image' : isVideo ? 'Video' : 'File';

        item.innerHTML = `
            <div class="pending-content">
                ${isImage ? `<img src="/forApprove/${file.name}" alt="${file.name}">` :
                  isVideo ? `<video src="/forApprove/${file.name}" controls></video>` : ''}
                <div class="file-type-badge">${fileType}</div>
            </div>
            <div class="pending-info">
                <div class="pending-name">${file.name}</div>
                <div class="pending-submitter">Submitted by ${file.submitter}</div>
                <div class="pending-actions">
                    <button class="approve-button" data-file="${file.name}">Approve</button>
                    <button class="deny-button" data-file="${file.name}">Deny</button>
                </div>
            </div>
        `;

        return item;
    }

    // Handle approve/deny actions
    pendingFiles.addEventListener('click', async (e) => {
        if (e.target.matches('.approve-button, .deny-button')) {
            const action = e.target.classList.contains('approve-button') ? 'approve' : 'deny';
            const fileName = e.target.dataset.file;

            try {
                const response = await fetch(`/file-action/${action}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fileName })
                });

                if (response.ok) {
                    loadPendingFiles(); // Refresh the list
                } else {
                    const data = await response.json();
                    alert(data.error || `Failed to ${action} file`);
                }
            } catch (error) {
                console.error(`Error ${action}ing file:`, error);
                alert(`Failed to ${action} file`);
            }
        }
    });

    // Logout handler
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Initial load
    loadPendingFiles();
}); 