// App State
const state = {
    stream: null,
    canvas: null,
    context: null,
    currentImage: null,
    flashEnabled: false,
    cameraActive: false,
    ocrWorker: null,
    corners: [], // for perspective correction
    dragging: false,
    dragIndex: -1,
    cvReady: false
};

// DOM Elements
const elements = {
    video: document.getElementById('cameraFeed'),
    previewCanvas: document.getElementById('previewCanvas'),
    ocrResults: document.getElementById('ocrResults'),
    statusMessage: document.getElementById('statusMessage'),
    processingIndicator: document.getElementById('processingIndicator'),
    startCameraBtn: document.getElementById('startCameraBtn'),
    stopCameraBtn: document.getElementById('stopCameraBtn'),
    captureBtn: document.getElementById('captureBtn'),
    flashBtn: document.getElementById('flashBtn'),
    correctPerspectiveBtn: document.getElementById('correctPerspectiveBtn'),
    edgeDetectBtn: document.getElementById('edgeDetectBtn'),
    ocrBtn: document.getElementById('ocrBtn'),
    resetBtn: document.getElementById('resetBtn'),
    copyBtn: document.getElementById('copyBtn'),
    overlayTextInput: document.getElementById('overlayTextInput'),
    applyOverlayBtn: document.getElementById('applyOverlayBtn'),
};

// Initialize Service Worker
async function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('js/service-worker.js');
            console.log('Service Worker registered successfully:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// OpenCV Ready
function onOpenCvReady() {
    state.cvReady = true;
    console.log('OpenCV.js is ready');
}

// Initialize OCR Worker
async function initOCR() {
    try {
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract.js library not loaded');
        }
        state.ocrWorker = await Tesseract.createWorker();
        await state.ocrWorker.loadLanguage('chi_sim+chi_tra');
        await state.ocrWorker.initialize('chi_sim+chi_tra');
        console.log('OCR Worker initialized');
    } catch (error) {
        console.error('OCR Worker initialization failed:', error);
        throw error;
    }
}

// Check for camera API support
function isCameraSupported() {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

// Start Camera
async function startCamera() {
    if (!isCameraSupported()) {
        showStatus('Camera API not supported on this device/browser.', 'error');
        return;
    }
    try {
        showStatus('Requesting camera access...', 'info');
        
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.video.srcObject = state.stream;
        
        state.cameraActive = true;
        updateButtonStates();
        showStatus('Camera started successfully', 'success');
    } catch (error) {
        console.error('Camera access error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

// Stop Camera
function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.cameraActive = false;
        elements.video.srcObject = null;
        updateButtonStates();
        showStatus('Camera stopped', 'info');
    }
}

// Capture Image
function captureImage() {
    if (!state.cameraActive) {
        showStatus('Camera is not active', 'error');
        return;
    }

    // Create canvas if not already done
    if (!state.canvas) {
        state.canvas = elements.previewCanvas;
        state.context = state.canvas.getContext('2d');
    }

    // Set canvas size to match video
    state.canvas.width = elements.video.videoWidth;
    state.canvas.height = elements.video.videoHeight;

    // Draw current frame
    state.context.drawImage(elements.video, 0, 0);
    
    // Get image data
    state.currentImage = state.canvas.toDataURL('image/jpeg');
    
    // Set corners for perspective correction
    state.corners = [
        { x: 0, y: 0 },
        { x: state.canvas.width, y: 0 },
        { x: state.canvas.width, y: state.canvas.height },
        { x: 0, y: state.canvas.height }
    ];
    
    // Hide video and show captured image
    elements.video.style.display = 'none';
    elements.previewCanvas.style.display = 'block';
    
    // Draw image with corners
    drawImageWithCorners();
    
    // Add mouse event listeners for dragging
    elements.previewCanvas.addEventListener('mousedown', handleMouseDown);
    elements.previewCanvas.addEventListener('mousemove', handleMouseMove);
    elements.previewCanvas.addEventListener('mouseup', handleMouseUp);
    elements.previewCanvas.addEventListener('mouseleave', handleMouseUp);
    
    // Enable processing buttons
    elements.correctPerspectiveBtn.disabled = false;
    elements.edgeDetectBtn.disabled = false;
    elements.ocrBtn.disabled = false;
    elements.copyBtn.disabled = true;
    
    showStatus('Image captured successfully', 'success');
}

// Draw image with draggable corners
function drawImageWithCorners() {
    if (!state.canvas || !state.currentImage) return;
    
    const ctx = state.context;
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Draw corners
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        state.corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 10, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });
    };
    img.src = state.currentImage;
}

// Get mouse position relative to canvas
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// Check if point is in circle
function isInCircle(point, center, radius) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return dx * dx + dy * dy <= radius * radius;
}

// Mouse event handlers for dragging corners
function handleMouseDown(evt) {
    const mousePos = getMousePos(elements.previewCanvas, evt);
    state.dragIndex = -1;
    for (let i = 0; i < state.corners.length; i++) {
        if (isInCircle(mousePos, state.corners[i], 10)) {
            state.dragging = true;
            state.dragIndex = i;
            break;
        }
    }
}

function handleMouseMove(evt) {
    if (state.dragging && state.dragIndex >= 0) {
        const mousePos = getMousePos(elements.previewCanvas, evt);
        state.corners[state.dragIndex].x = mousePos.x;
        state.corners[state.dragIndex].y = mousePos.y;
        drawImageWithCorners();
    }
}

function handleMouseUp() {
    state.dragging = false;
    state.dragIndex = -1;
}

// Correct Perspective
function correctPerspective() {
    if (!state.canvas || state.corners.length !== 4) {
        showStatus('No image or corners defined', 'error');
        return;
    }

    if (!state.cvReady) {
        showStatus('OpenCV not loaded yet, please wait', 'error');
        return;
    }

    showProcessing(true);

    setTimeout(() => {
        try {
            const srcCanvas = state.canvas;
            const srcImageData = srcCanvas.getContext('2d').getImageData(0, 0, srcCanvas.width, srcCanvas.height);
            
            // Create OpenCV Mat from image data
            const src = cv.matFromImageData(srcImageData);
            
            // Define source and destination points
            const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                state.corners[0].x, state.corners[0].y,
                state.corners[1].x, state.corners[1].y,
                state.corners[2].x, state.corners[2].y,
                state.corners[3].x, state.corners[3].y
            ]);
            
            // Destination rectangle (A4 aspect ratio)
            const destWidth = srcCanvas.width;
            const destHeight = Math.round(destWidth * 1.414);
            
            const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                destWidth, 0,
                destWidth, destHeight,
                0, destHeight
            ]);
            
            // Get perspective transform matrix
            const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
            
            // Apply perspective transformation
            const dst = new cv.Mat();
            cv.warpPerspective(src, dst, M, new cv.Size(destWidth, destHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
            
            // Update canvas
            state.canvas.width = destWidth;
            state.canvas.height = destHeight;
            cv.imshow(state.canvas, dst);
            
            // Update current image
            state.currentImage = state.canvas.toDataURL('image/jpeg');
            
            // Reset corners
            state.corners = [
                { x: 0, y: 0 },
                { x: destWidth, y: 0 },
                { x: destWidth, y: destHeight },
                { x: 0, y: destHeight }
            ];
            
            // Redraw
            drawImageWithCorners();
            
            // Clean up
            src.delete();
            srcPoints.delete();
            dstPoints.delete();
            M.delete();
            dst.delete();
            
            showStatus('Perspective corrected successfully', 'success');
        } catch (error) {
            console.error('Perspective correction error:', error);
            showStatus(`Perspective correction error: ${error.message}`, 'error');
        }

        showProcessing(false);
    }, 100);
}

// Toggle Flash
async function toggleFlash() {
    try {
        if (!state.stream) {
            showStatus('Camera is not active', 'error');
            return;
        }

        const track = state.stream.getVideoTracks()[0];
        if (!track) {
            showStatus('Camera track not available', 'error');
            return;
        }

        const capabilities = track.getCapabilities();
        if (!capabilities.torch) {
            showStatus('Flash not supported on this device', 'error');
            return;
        }

        state.flashEnabled = !state.flashEnabled;
        await track.applyConstraints({ torch: state.flashEnabled });
        
        elements.flashBtn.textContent = state.flashEnabled ? '💡 Flash On' : '💡 Flash Off';
        showStatus(`Flash ${state.flashEnabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
        console.error('Flash toggle error:', error);
        showStatus(`Flash error: ${error.message}`, 'error');
    }
}

// Edge Detection using Canvas Pixel Manipulation
function detectEdges() {
    if (!state.canvas) {
        showStatus('No image captured', 'error');
        return;
    }

    showProcessing(true);

    setTimeout(() => {
        try {
            const sourceCanvas = state.canvas;
            const sourceCtx = sourceCanvas.getContext('2d');
            const sourceImageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            
            const edgeCanvas = elements.previewCanvas;
            const edgeCtx = edgeCanvas.getContext('2d');
            edgeCanvas.width = sourceCanvas.width;
            edgeCanvas.height = sourceCanvas.height;
            
            const edgeImageData = edgeCtx.createImageData(sourceCanvas.width, sourceCanvas.height);
            
            // Sobel edge detection
            applyCannyEdgeDetection(sourceImageData, edgeImageData);
            
            edgeCtx.putImageData(edgeImageData, 0, 0);
            
            // Update current image for OCR
            state.currentImage = edgeCanvas.toDataURL('image/jpeg');
            
            elements.edgeDetectBtn.disabled = false;
            showStatus('Edge detection completed', 'success');
        } catch (error) {
            console.error('Edge detection error:', error);
            showStatus(`Edge detection error: ${error.message}`, 'error');
        }

        showProcessing(false);
    }, 100);
}

// Canny Edge Detection Algorithm
function applyCannyEdgeDetection(sourceImageData, edgeImageData) {
    const src = sourceImageData.data;
    const dst = edgeImageData.data;
    const width = sourceImageData.width;
    const height = sourceImageData.height;

    // Step 1: Convert to grayscale
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < src.length; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        gray[i / 4] = (r + g + b) / 3;
    }

    // Step 2: Apply Gaussian blur (simplified)
    const blurred = gaussianBlur(gray, width, height);

    // Step 3: Calculate Sobel edges
    const edges = sobelEdgeDetection(blurred, width, height);

    // Step 4: Convert edges to RGBA
    for (let i = 0; i < edges.length; i++) {
        const idx = i * 4;
        const value = edges[i];
        dst[idx] = value;
        dst[idx + 1] = value;
        dst[idx + 2] = value;
        dst[idx + 3] = 255;
    }
}

function gaussianBlur(gray, width, height) {
    const blurred = new Uint8ClampedArray(width * height);
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const sum = 16;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let val = 0;
            let idx = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    val += gray[(y + ky) * width + (x + kx)] * kernel[idx++];
                }
            }
            blurred[y * width + x] = val / sum;
        }
    }
    return blurred;
}

function sobelEdgeDetection(gray, width, height) {
    const edges = new Uint8ClampedArray(width * height);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const threshold = 100;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            let idx = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixel = gray[(y + ky) * width + (x + kx)];
                    gx += pixel * sobelX[idx];
                    gy += pixel * sobelY[idx];
                    idx++;
                }
            }
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edges[y * width + x] = magnitude > threshold ? 255 : 0;
        }
    }
    return edges;
}

// OCR using Tesseract
async function extractTextOCR() {
    if (!state.currentImage) {
        showStatus('No image to process', 'error');
        return;
    }

    showProcessing(true);
    showStatus('Extracting text from image...', 'info');

    try {
        if (!state.ocrWorker) {
            await initOCR();
        }

        const { data: { text } } = await state.ocrWorker.recognize(state.currentImage);
        
        elements.ocrResults.value = text;
        elements.copyBtn.disabled = false;
        
        showStatus('OCR completed successfully', 'success');
    } catch (error) {
        console.error('OCR error:', error);
        const errorMsg = error?.message || error?.toString() || 'Unknown error';
        showStatus(`OCR error: ${errorMsg}`, 'error');
        elements.ocrResults.value = 'Error during text extraction. Please try again.';
    }

    showProcessing(false);
}

// Copy OCR Results
function copyResults() {
    const text = elements.ocrResults.value;
    if (text) {
        navigator.clipboard.writeText(text).then(() => {
            showStatus('Text copied to clipboard', 'success');
        }).catch(() => {
            showStatus('Failed to copy text', 'error');
        });
    }
}

// Reset
async function reset() {
    state.currentImage = null;
    elements.previewCanvas.getContext('2d').clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
    elements.ocrResults.value = '';
    state.corners = [];
    
    // Remove event listeners
    elements.previewCanvas.removeEventListener('mousedown', handleMouseDown);
    elements.previewCanvas.removeEventListener('mousemove', handleMouseMove);
    elements.previewCanvas.removeEventListener('mouseup', handleMouseUp);
    elements.previewCanvas.removeEventListener('mouseleave', handleMouseUp);
    
    // Terminate OCR worker to free memory
    if (state.ocrWorker) {
        await state.ocrWorker.terminate();
        state.ocrWorker = null;
    }
    
    // Show video and hide captured image
    elements.video.style.display = 'block';
    elements.previewCanvas.style.display = 'none';
    
    updateButtonStates();
    showStatus('Reset complete', 'info');
}

// Overlay text on captured image
function overlayTextOnImage() {
    const text = elements.overlayTextInput.value.trim();
    if (!state.canvas || !state.currentImage || !text) {
        showStatus('No image or text to overlay.', 'error');
        return;
    }
    const ctx = state.context;
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        ctx.drawImage(img, 0, 0);
        // Draw corners if present
        if (state.corners && state.corners.length === 4) {
            ctx.fillStyle = 'red';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            state.corners.forEach(corner => {
                ctx.beginPath();
                ctx.arc(corner.x, corner.y, 10, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            });
        }
        // Overlay text
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(text, state.canvas.width / 2, state.canvas.height / 2);
    };
    img.src = state.currentImage;
    showStatus('Overlay text applied.', 'success');
}

// Update Button States
function updateButtonStates() {
    elements.stopCameraBtn.disabled = !state.cameraActive;
    elements.captureBtn.disabled = !state.cameraActive;
    elements.flashBtn.disabled = !state.cameraActive;
    
    if (!state.currentImage) {
        elements.correctPerspectiveBtn.disabled = true;
        elements.edgeDetectBtn.disabled = true;
        elements.ocrBtn.disabled = true;
    }
}

// Show Status Message
function showStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Show/Hide Processing Indicator
function showProcessing(show) {
    elements.processingIndicator.style.display = show ? 'flex' : 'none';
}

// Event Listeners
elements.startCameraBtn.addEventListener('click', startCamera);
elements.stopCameraBtn.addEventListener('click', stopCamera);
elements.captureBtn.addEventListener('click', captureImage);
elements.flashBtn.addEventListener('click', toggleFlash);
elements.correctPerspectiveBtn.addEventListener('click', correctPerspective);
elements.edgeDetectBtn.addEventListener('click', detectEdges);
elements.ocrBtn.addEventListener('click', extractTextOCR);
elements.resetBtn.addEventListener('click', reset);
elements.copyBtn.addEventListener('click', copyResults);
elements.applyOverlayBtn.addEventListener('click', overlayTextOnImage);

// Handle video play to ensure camera is streaming
elements.video.addEventListener('play', () => {
    console.log('Video stream started');
});

// Initialize App
window.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialized');
    await initServiceWorker();
    await initOCR();
    updateButtonStates();
    showStatus('Ready. Click "Start Camera" to begin.', 'info');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
    if (state.ocrWorker) {
        state.ocrWorker.terminate();
    }
});

// Handle visibility change (pause camera when tab is not visible)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.cameraActive) {
        console.log('Tab hidden, pausing camera');
    } else if (!document.hidden && !state.cameraActive) {
        console.log('Tab visible');
    }
});
