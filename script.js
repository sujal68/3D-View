// Configuration
const TOTAL_FRAMES = 150;
const SENSITIVITY = 0.3;
const LERP_FACTOR = 0.2;
const MOMENTUM_DECAY = 0.85;
const MIN_VELOCITY = 0.01;
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 3.0;
const ZOOM_SENSITIVITY = 0.001;

// State
let currentFrame = 1;
let targetFrame = 1;
let velocity = 0;
let isDragging = false;
let lastX = 0;
let images = [];
let imagesLoaded = 0;
let currentZoom = 1;
let targetZoom = 1;
let transformOriginX = 50;
let transformOriginY = 50;

// DOM
const viewer = document.getElementById('carViewer');
const carImage = document.getElementById('carImage');
const loadingOverlay = document.getElementById('loadingOverlay');

// Preload all images
function preloadImages() {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
        const img = new Image();
        const frameNum = String(i).padStart(4, '0');
        img.src = `images/${frameNum}.jpg`;

        img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === TOTAL_FRAMES) {
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');

                    // Show mobile hint on touch devices
                    if ('ontouchstart' in window) {
                        document.querySelector('.desktop-hint').style.display = 'none';
                        document.querySelector('.mobile-hint').style.display = 'inline';
                    }
                }, 300);
            }
        };

        images[i - 1] = img;
    }
}

// Smooth frame wrapping
function wrapFrame(frame) {
    while (frame > TOTAL_FRAMES) frame -= TOTAL_FRAMES;
    while (frame < 1) frame += TOTAL_FRAMES;
    return frame;
}

// Update frame with smooth interpolation
function updateFrame() {
    const frameDiff = targetFrame - currentFrame;

    // Handle wrapping for shortest path
    let adjustedDiff = frameDiff;
    if (Math.abs(frameDiff) > TOTAL_FRAMES / 2) {
        if (frameDiff > 0) {
            adjustedDiff = frameDiff - TOTAL_FRAMES;
        } else {
            adjustedDiff = frameDiff + TOTAL_FRAMES;
        }
    }

    // Smooth interpolation
    if (Math.abs(adjustedDiff) > 0.01 || Math.abs(velocity) > MIN_VELOCITY) {
        currentFrame += adjustedDiff * LERP_FACTOR;

        // Apply momentum
        if (!isDragging) {
            targetFrame += velocity;
            velocity *= MOMENTUM_DECAY;

            if (Math.abs(velocity) < MIN_VELOCITY) {
                velocity = 0;
            }
        }

        // Wrap frames
        currentFrame = wrapFrame(currentFrame);
        targetFrame = wrapFrame(targetFrame);

        // Update image source
        const frameIndex = Math.round(currentFrame);
        const safeIndex = wrapFrame(frameIndex);
        const frameNum = String(safeIndex).padStart(4, '0');

        if (carImage.src !== `images/${frameNum}.jpg`) {
            carImage.src = `images/${frameNum}.jpg`;
        }
    }

    // Smooth zoom interpolation
    if (Math.abs(targetZoom - currentZoom) > 0.01) {
        currentZoom += (targetZoom - currentZoom) * 0.1;
        carImage.style.transformOrigin = `${transformOriginX}% ${transformOriginY}%`;
        carImage.style.transform = `scale(${currentZoom})`;
    }

    requestAnimationFrame(updateFrame);
}

// Mouse wheel zoom
viewer.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    // Get cursor position relative to image
    const rect = viewer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Set transform origin to cursor position
    transformOriginX = Math.max(0, Math.min(100, x));
    transformOriginY = Math.max(0, Math.min(100, y));
    
    const zoomFactor = 1 + (-e.deltaY * ZOOM_SENSITIVITY);
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom * zoomFactor));
});

// Desktop mouse events
viewer.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    velocity = 0;
    viewer.classList.add('grabbing');
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastX;
    const frameDelta = deltaX * SENSITIVITY;

    targetFrame += frameDelta;
    velocity = frameDelta * 0.3;

    lastX = e.clientX;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    velocity = 0;
    viewer.classList.remove('grabbing');
});

// Touch events
let touchStartX = 0;
let touchLastX = 0;
let touchVelocities = [];
let initialDistance = 0;
let initialZoom = 1;

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

viewer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        initialDistance = getTouchDistance(e.touches);
        initialZoom = currentZoom;
        isDragging = false;
    } else if (e.touches.length === 1) {
        isDragging = true;
        touchStartX = e.touches[0].clientX;
        touchLastX = e.touches[0].clientX;
        velocity = 0;
        touchVelocities = [];
    }
}, { passive: true });

viewer.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        const currentDistance = getTouchDistance(e.touches);
        const scale = currentDistance / initialDistance;
        targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialZoom * scale));
    } else if (e.touches.length === 1 && isDragging) {
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - touchLastX;
        const frameDelta = deltaX * SENSITIVITY;

        targetFrame += frameDelta;

        touchVelocities.push({
            delta: frameDelta,
            time: Date.now()
        });

        if (touchVelocities.length > 5) {
            touchVelocities.shift();
        }

        touchLastX = touchX;
    }
}, { passive: true });

viewer.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        isDragging = false;
        velocity = 0;
    }
}, { passive: true });

// Prevent context menu on long press
viewer.addEventListener('contextmenu', (e) => e.preventDefault());

// Prevent image drag
carImage.addEventListener('dragstart', (e) => e.preventDefault());

// Initialize
preloadImages();
requestAnimationFrame(updateFrame);