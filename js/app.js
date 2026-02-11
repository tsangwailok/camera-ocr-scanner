// App State
const state = {
    stream: null,
    canvas: null,
    context: null,
    currentImage: null,
    flashEnabled: false,
    cameraActive: false,
    ocrWorker: null,
};

// DOM Elements
const elements = {
    video: document.getElementById('cameraFeed'),
    previewCanvas: document.getElementById('previewCanvas'),
    originalCanvas: document.getElementById('originalCanvas'),
    edgeCanvas: document.getElementById('edgeCanvas'),
    ocrResults: document.getElementById('ocrResults'),
    statusMessage: document.getElementById('statusMessage'),
    processingIndicator: document.getElementById('processingIndicator'),
    startCameraBtn: document.getElementById('startCameraBtn'),
    stopCameraBtn: document.getElementById('stopCameraBtn'),
    captureBtn: document.getElementById('captureBtn'),
    flashBtn: document.getElementById('flashBtn'),
    edgeDetectBtn: document.getElementById('edgeDetectBtn'),
    ocrBtn: document.getElementById('ocrBtn'),
    resetBtn: document.getElementById('resetBtn'),
    copyBtn: document.getElementById('copyBtn'),
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

// Initialize OCR Worker
async function initOCR() {
    try {
        state.ocrWorker = await Tesseract.createWorker();
        console.log('OCR Worker initialized');
    } catch (error) {
        console.error('OCR Worker initialization failed:', error);
    }
}

// Start Camera
async function startCamera() {
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
    
    // Display in original canvas
    displayImage(elements.originalCanvas, state.canvas);
    
    // Enable processing buttons
    elements.edgeDetectBtn.disabled = false;
    elements.ocrBtn.disabled = false;
    elements.copyBtn.disabled = true;
    
    showStatus('Image captured successfully', 'success');
}

// Display Image on Canvas
function displayImage(canvas, sourceCanvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    ctx.drawImage(sourceCanvas, 0, 0);
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
            
            const edgeCanvas = elements.edgeCanvas;
            const edgeCtx = edgeCanvas.getContext('2d');
            edgeCanvas.width = sourceCanvas.width;
            edgeCanvas.height = sourceCanvas.height;
            
            const edgeImageData = edgeCtx.createImageData(sourceCanvas.width, sourceCanvas.height);
            
            // Sobel edge detection
            applyCannyEdgeDetection(sourceImageData, edgeImageData);
            
            edgeCtx.putImageData(edgeImageData, 0, 0);
            
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
        showStatus(`OCR error: ${error.message}`, 'error');
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
function reset() {
    state.currentImage = null;
    elements.originalCanvas.getContext('2d').clearRect(0, 0, elements.originalCanvas.width, elements.originalCanvas.height);
    elements.edgeCanvas.getContext('2d').clearRect(0, 0, elements.edgeCanvas.width, elements.edgeCanvas.height);
    elements.ocrResults.value = '';
    updateButtonStates();
    showStatus('Reset complete', 'info');
}

// Update Button States
function updateButtonStates() {
    elements.stopCameraBtn.disabled = !state.cameraActive;
    elements.captureBtn.disabled = !state.cameraActive;
    elements.flashBtn.disabled = !state.cameraActive;
    
    if (!state.currentImage) {
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
elements.edgeDetectBtn.addEventListener('click', detectEdges);
elements.ocrBtn.addEventListener('click', extractTextOCR);
elements.resetBtn.addEventListener('click', reset);
elements.copyBtn.addEventListener('click', copyResults);

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
