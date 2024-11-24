document.addEventListener("DOMContentLoaded", function() {
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error:', error);
        }
    });

    let allItems = [];
    const ITEMS_PER_PAGE = 16;
    let currentPage = 1;

    fetch('/files')
        .then(response => response.json())
        .then(items => {
            allItems = items;
            setupFilters();
            renderGallery();
        })
        .catch(error => console.error('Error loading gallery items:', error));

    function setupFilters() {
        const typeFilter = document.getElementById('typeFilter');
        const searchInput = document.getElementById('searchInput');
        const dateFilter = document.getElementById('dateFilter');

        typeFilter.addEventListener('change', () => {
            currentPage = 1;
            renderGallery();
        });

        searchInput.addEventListener('input', () => {
            currentPage = 1;
            renderGallery();
        });

        dateFilter.addEventListener('change', () => {
            currentPage = 1;
            renderGallery();
        });

        // Keyboard shortcut for search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    function getFilteredItems() {
        const typeFilter = document.getElementById('typeFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const dateFilter = document.getElementById('dateFilter').value;

        let filteredItems = [...allItems];

        // Apply type filter
        if (typeFilter !== 'all') {
            const imageTypes = ['jpg', 'jpeg', 'png', 'gif'];
            const videoTypes = ['mp4', 'webm', 'ogg', 'mov'];
            filteredItems = filteredItems.filter(itemSrc => {
                const extension = itemSrc.split('.').pop().toLowerCase();
                if (typeFilter === 'image') {
                    return imageTypes.includes(extension);
                } else if (typeFilter === 'video') {
                    return videoTypes.includes(extension);
                }
                return true;
            });
        }

        // Apply search filter
        if (searchTerm) {
            filteredItems = filteredItems.filter(itemSrc => {
                const fileName = itemSrc.split('/').pop().toLowerCase();
                return fileName.includes(searchTerm);
            });
        }

        // Apply sorting
        if (dateFilter === 'random') {
            // Fisher-Yates shuffle algorithm
            for (let i = filteredItems.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [filteredItems[i], filteredItems[j]] = [filteredItems[j], filteredItems[i]];
            }
        } else {
            // Normal sorting by name
            filteredItems.sort((a, b) => {
                const nameA = a.split('/').pop();
                const nameB = b.split('/').pop();
                return dateFilter === 'newest' ? 
                    nameB.localeCompare(nameA) : 
                    nameA.localeCompare(nameB);
            });
        }

        return filteredItems;
    }

    let currentPreviewIndex = 0;
    const previewModal = document.getElementById('previewModal');
    const previewMediaContainer = document.querySelector('.preview-media-container');
    const previewName = document.querySelector('.preview-name');
    const previewDownload = document.querySelector('.preview-download');
    const closePreview = document.querySelector('.close-preview');
    const prevPreview = document.querySelector('.preview-nav.prev');
    const nextPreview = document.querySelector('.preview-nav.next');

    function showPreview(index) {
        const filteredItems = getFilteredItems();
        currentPreviewIndex = index;
        const itemSrc = filteredItems[index];
        const itemName = itemSrc.split('/').pop();
        const itemExtension = itemName.split('.').pop().toLowerCase();

        previewMediaContainer.innerHTML = '';
        
        if (['jpg', 'jpeg', 'png', 'gif'].includes(itemExtension)) {
            const img = new Image();
            img.src = itemSrc;
            img.alt = itemName;
            previewMediaContainer.appendChild(img);
        } else if (['mp4', 'webm', 'ogg', 'mov'].includes(itemExtension)) {
            const video = document.createElement('video');
            video.src = itemSrc;
            video.controls = true;
            video.autoplay = true;
            previewMediaContainer.appendChild(video);
        }

        previewName.textContent = itemName;
        previewDownload.href = itemSrc;
        previewDownload.download = itemName;
        
        // Update navigation buttons
        prevPreview.style.display = index > 0 ? '' : 'none';
        nextPreview.style.display = index < filteredItems.length - 1 ? '' : 'none';
        
        previewModal.classList.add('show');
    }

    function renderGallery() {
        const filteredItems = getFilteredItems();
        const galleryContainer = document.getElementById('gallery');
        galleryContainer.innerHTML = '';

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const itemsToShow = filteredItems.slice(startIndex, endIndex);

        itemsToShow.forEach((itemSrc, index) => {
            const itemName = itemSrc.split('/').pop();
            const itemExtension = itemName.split('.').pop().toLowerCase();

            const galleryItem = document.createElement('div');
            galleryItem.classList.add('gallery-item');

            const contentWrapper = document.createElement('div');
            contentWrapper.classList.add('content-wrapper');

            if (['jpg', 'jpeg', 'png', 'gif'].includes(itemExtension)) {
                const img = new Image();
                img.onload = function() {
                    const aspectRatio = img.width / img.height;
                    contentWrapper.style.aspectRatio = aspectRatio.toFixed(2);
                };
                img.src = itemSrc;
                img.alt = itemName;
                img.classList.add('content-img');
                contentWrapper.appendChild(img);
            } else if (['mp4', 'webm', 'ogg', 'mov'].includes(itemExtension)) {
                const video = document.createElement('video');
                video.src = itemSrc;
                video.controls = true;
                video.preload = 'metadata';
                video.addEventListener('loadedmetadata', function() {
                    const aspectRatio = video.videoWidth / video.videoHeight;
                    contentWrapper.style.aspectRatio = aspectRatio.toFixed(2);
                });
                contentWrapper.appendChild(video);
            }

            const itemInfo = document.createElement('div');
            itemInfo.classList.add('item-info');

            const itemNameElem = document.createElement('div');
            itemNameElem.classList.add('item-name');
            itemNameElem.textContent = itemName;
            itemInfo.appendChild(itemNameElem);

            const downloadLink = document.createElement('a');
            downloadLink.href = itemSrc;
            downloadLink.download = itemName;
            downloadLink.className = 'download-button';
            downloadLink.textContent = 'Download';
            itemInfo.appendChild(downloadLink);

            galleryItem.appendChild(contentWrapper);
            galleryItem.appendChild(itemInfo);
            galleryContainer.appendChild(galleryItem);

            // Add click handler to content wrapper
            contentWrapper.addEventListener('click', () => {
                showPreview(startIndex + index);
            });
        });

        renderPagination(filteredItems.length);
    }

    function renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const paginationContainer = document.getElementById('pagination');
        paginationContainer.innerHTML = '';

        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.classList.add('pagination-button');
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                renderGallery();
            }
        });

        const pageInfo = document.createElement('span');
        pageInfo.classList.add('page-info');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.classList.add('pagination-button');
        nextButton.disabled = currentPage >= totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                renderGallery();
            }
        });

        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(nextButton);
    }

    // Password change functionality
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordModal = document.getElementById('passwordModal');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const cancelPasswordChange = document.getElementById('cancelPasswordChange');
    const passwordError = document.getElementById('passwordError');
    const newPasswordInput = document.getElementById('newPassword');
    const strengthBar = document.querySelector('.password-strength-bar');

    changePasswordBtn.addEventListener('click', () => {
        passwordModal.classList.add('show');
        passwordError.textContent = '';
        changePasswordForm.reset();
    });

    cancelPasswordChange.addEventListener('click', () => {
        passwordModal.classList.remove('show');
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        passwordError.textContent = '';

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            passwordError.textContent = 'New passwords do not match';
            return;
        }

        try {
            const response = await fetch('/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Password changed successfully');
                passwordModal.classList.remove('show');
                changePasswordForm.reset();
            } else {
                passwordError.textContent = data.error || 'Failed to change password';
            }
        } catch (error) {
            console.error('Error:', error);
            passwordError.textContent = 'An error occurred. Please try again.';
        }
    });

    newPasswordInput.addEventListener('input', () => {
        const password = newPasswordInput.value;
        const strength = checkPasswordStrength(password);
        updateStrengthBar(strength);
    });

    function checkPasswordStrength(password) {
        if (password.length < 6) return 'weak';
        
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score >= 3) return 'strong';
        if (score >= 2) return 'medium';
        return 'weak';
    }

    function updateStrengthBar(strength) {
        strengthBar.className = 'password-strength-bar';
        strengthBar.classList.add(`strength-${strength}`);
    }

    // Update error message display
    function showError(message) {
        passwordError.textContent = message;
        passwordError.classList.add('show');
    }

    function hideError() {
        passwordError.textContent = '';
        passwordError.classList.remove('show');
    }

    // Close modal when clicking outside
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            passwordModal.classList.remove('show');
        }
    });

    // Upload functionality
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const uploadForm = document.getElementById('uploadForm');
    const cancelUpload = document.getElementById('cancelUpload');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const uploadProgress = document.getElementById('uploadProgress');

    uploadBtn.addEventListener('click', () => {
        uploadModal.classList.add('show');
        fileList.innerHTML = '';
        uploadProgress.innerHTML = '';
    });

    cancelUpload.addEventListener('click', () => {
        uploadModal.classList.remove('show');
        fileInput.value = '';
        fileList.innerHTML = '';
        uploadProgress.innerHTML = '';
    });

    // Close modal when clicking outside
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('show');
        }
    });

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
            const response = await fetch('/submit-files', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('Files submitted for approval successfully');
                uploadModal.classList.remove('show');
                fileInput.value = '';
                fileList.innerHTML = '';
            } else {
                const data = await response.json();
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

    // Preview navigation
    prevPreview.addEventListener('click', () => {
        if (currentPreviewIndex > 0) {
            showPreview(currentPreviewIndex - 1);
        }
    });

    nextPreview.addEventListener('click', () => {
        const filteredItems = getFilteredItems();
        if (currentPreviewIndex < filteredItems.length - 1) {
            showPreview(currentPreviewIndex + 1);
        }
    });

    // Close preview
    closePreview.addEventListener('click', () => {
        previewModal.classList.remove('show');
    });

    // Close on background click
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.classList.remove('show');
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!previewModal.classList.contains('show')) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                prevPreview.click();
                break;
            case 'ArrowRight':
                nextPreview.click();
                break;
            case 'Escape':
                previewModal.classList.remove('show');
                break;
        }
    });
});
