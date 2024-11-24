document.addEventListener("DOMContentLoaded", function() {
    let mediaItems = [];
    let currentIndex = 0;
    const mediaContainer = document.querySelector('.media-container');
    const prevButton = document.querySelector('.nav-button.prev');
    const nextButton = document.querySelector('.nav-button.next');
    const downloadButton = document.querySelector('.download-button-random');

    // Fetch all items
    fetch('/files')
        .then(response => response.json())
        .then(items => {
            mediaItems = items;
            shuffleArray(mediaItems);
            showCurrentMedia();
        })
        .catch(error => console.error('Error loading media items:', error));

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function showCurrentMedia() {
        const itemSrc = mediaItems[currentIndex];
        const itemName = itemSrc.split('/').pop();
        const itemExtension = itemName.split('.').pop().toLowerCase();

        mediaContainer.innerHTML = '';

        if (['jpg', 'jpeg', 'png', 'gif'].includes(itemExtension)) {
            const img = new Image();
            img.src = itemSrc;
            img.alt = itemName;
            mediaContainer.appendChild(img);
        } else if (['mp4', 'webm', 'ogg', 'mov'].includes(itemExtension)) {
            const video = document.createElement('video');
            video.src = itemSrc;
            video.controls = true;
            video.autoplay = true;
            mediaContainer.appendChild(video);
        }

        // Update download button
        downloadButton.href = itemSrc;
        downloadButton.download = itemName;
        downloadButton.textContent = `Download ${itemExtension.toUpperCase()}`;
    }

    function nextMedia(direction) {
        const currentMedia = mediaContainer.firstChild;
        const outClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
        const inClass = direction === 'next' ? 'slide-in-left' : 'slide-in-right';

        currentMedia.classList.add(outClass);

        setTimeout(() => {
            currentIndex = direction === 'next' 
                ? (currentIndex + 1) % mediaItems.length 
                : (currentIndex - 1 + mediaItems.length) % mediaItems.length;
            
            showCurrentMedia();
            const newMedia = mediaContainer.firstChild;
            newMedia.classList.add(inClass);
            
            setTimeout(() => {
                newMedia.classList.remove(inClass);
            }, 300);
        }, 300);
    }

    // Button controls
    nextButton.addEventListener('click', () => nextMedia('next'));
    prevButton.addEventListener('click', () => nextMedia('prev'));

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextMedia('next');
        if (e.key === 'ArrowLeft') nextMedia('prev');
    });

    // Swipe controls
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                nextMedia('prev'); // Swipe right = previous
            } else {
                nextMedia('next'); // Swipe left = next
            }
        }
    }
}); 