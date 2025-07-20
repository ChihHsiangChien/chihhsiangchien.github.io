const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const leftCanvas = document.getElementById('left-mirrored');
const rightCanvas = document.getElementById('right-mirrored');
const captureButton = document.getElementById('capture');
const ctx = canvas.getContext('2d');
const leftCtx = leftCanvas.getContext('2d');
const rightCtx = rightCanvas.getContext('2d');

let dragLine = { x: 0, y: 0, dragging: false };
let isLiveMode = true;
let animationId = null;

// Update button text
captureButton.textContent = 'Capture';

// Function to draw live video
function drawLiveVideo() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (isLiveMode) {
        animationId = requestAnimationFrame(drawLiveVideo);
    }
}

// Access the user's camera
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            drawLiveVideo();
        };
    })
    .catch(err => {
        console.error('Error accessing camera:', err);
    });

// Toggle between live and capture modes
captureButton.addEventListener('click', () => {
    isLiveMode = !isLiveMode;
    captureButton.textContent = isLiveMode ? 'Capture' : 'Live';

    if (isLiveMode) {
        // Switch to live mode
        drawLiveVideo();
    } else {
        // Switch to capture mode
        cancelAnimationFrame(animationId);
        // Initialize draggable line
        dragLine.x = canvas.width / 2;
        dragLine.y = canvas.height / 2;
        drawLine();
    }
});

// Draw the draggable line
function drawLine() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(dragLine.x, 0);
    ctx.lineTo(dragLine.x, canvas.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Handle dragging the line - only in capture mode
canvas.addEventListener('mousedown', (e) => {
    if (!isLiveMode) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (Math.abs(x - dragLine.x) < 10) {
            dragLine.dragging = true;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isLiveMode && dragLine.dragging) {
        const rect = canvas.getBoundingClientRect();
        dragLine.x = e.clientX - rect.left;
        drawLine();
    }
});

canvas.addEventListener('mouseup', () => {
    if (!isLiveMode && dragLine.dragging) {
        dragLine.dragging = false;
        generateMirroredImages();
    }
});

// Generate mirrored images
function generateMirroredImages() {
    const width = canvas.width;
    const height = canvas.height;
    const rightPartWidth = width - dragLine.x;

    // Left mirrored image (unchanged)
    leftCanvas.width = dragLine.x * 2;
    leftCanvas.height = height;
    const leftImageData = ctx.getImageData(0, 0, dragLine.x, height);
    leftCtx.putImageData(leftImageData, 0, 0);
    leftCtx.save();
    leftCtx.scale(-1, 1);
    leftCtx.drawImage(canvas, 0, 0, dragLine.x, height, -dragLine.x * 2, 0, dragLine.x, height);
    leftCtx.restore();

    // Right mirrored image
    rightCanvas.width = rightPartWidth * 2;
    rightCanvas.height = height;

    // Draw original right part on the rightmost side
    const rightImageData = ctx.getImageData(dragLine.x, 0, rightPartWidth, height);
    rightCtx.putImageData(rightImageData, rightPartWidth, 0);

    // Draw mirrored right part on the left side
    rightCtx.save();
    rightCtx.scale(-1, 1);
    rightCtx.translate(-rightPartWidth, 0);
    rightCtx.drawImage(canvas, dragLine.x, 0, rightPartWidth, height, 0, 0, rightPartWidth, height);
    rightCtx.restore();
}