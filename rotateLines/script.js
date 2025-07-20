const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Default values for lengths, speeds, multipliers
let lengths = [19.11, 30.45, 22.72];
let speeds = [41, 53, -41];
let lengthMultiplier = 5;
let speedMultiplier = 10;

let angles = [0, 0, 0];  // Initial angles of each segment

// Set default values in the input fields via JavaScript
document.getElementById('lengthsInput').value = lengths.join(', ');
document.getElementById('speedsInput').value = speeds.join(', ');
document.getElementById('lengthMultiplierInput').value = lengthMultiplier;
document.getElementById('speedMultiplierInput').value = speedMultiplier;

// Convert degrees to radians
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// Get the end point of a line segment given its starting point, length, and angle
function getEndpoint(startX, startY, length, angle) {
    return {
        x: startX + length * Math.cos(angle),
        y: startY + length * Math.sin(angle)
    };
}

// Variables to store the trajectory of the last segment's endpoint
const trajectory = [];

// Function to draw the line segments
function drawSegments() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    let currentX = centerX;
    let currentY = centerY;
    let lastX, lastY;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set line styles
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < lengths.length; i++) {
        ctx.moveTo(currentX, currentY);
        let angle = degreesToRadians(angles[i]);
        const end = getEndpoint(currentX, currentY, lengths[i] * lengthMultiplier, angle);
        ctx.lineTo(end.x, end.y);

        currentX = end.x;
        currentY = end.y;

        if (i === lengths.length - 1) {
            lastX = currentX;
            lastY = currentY;
        }
    }

    ctx.stroke();

    // Store the last segment's endpoint for drawing trajectory
    trajectory.push({x: lastX, y: lastY});

    // Draw the trajectory of the last segment's endpoint
    ctx.strokeStyle = 'yellow';
    ctx.beginPath();
    trajectory.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    ctx.stroke();
}

// Function to update the angles of the segments
function updateAngles(deltaTime) {
    for (let i = 0; i < speeds.length; i++) {
        angles[i] += speeds[i] * speedMultiplier * deltaTime / 1000;
    }
}

// Animation loop
let lastTime = 0;
function animate(time) {
    const deltaTime = time - lastTime;
    lastTime = time;

    updateAngles(deltaTime);
    drawSegments();

    requestAnimationFrame(animate);
}

// Start the animation
requestAnimationFrame(animate);

// Function to parse input from the input boxes
function parseInput(inputStr) {
    return inputStr.split(',').map(Number);
}

// Apply button logic
document.getElementById('applyButton').addEventListener('click', () => {
    const lengthsInput = document.getElementById('lengthsInput').value;
    const speedsInput = document.getElementById('speedsInput').value;
    const lengthMultiplierInput = document.getElementById('lengthMultiplierInput').value;
    const speedMultiplierInput = document.getElementById('speedMultiplierInput').value;

    lengths = parseInput(lengthsInput);
    speeds = parseInput(speedsInput);
    lengthMultiplier = Number(lengthMultiplierInput);
    speedMultiplier = Number(speedMultiplierInput);

    // Reset angles and trajectory when new values are applied
    angles = Array(lengths.length).fill(0);
    trajectory.length = 0;  // Clear trajectory
});
