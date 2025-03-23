// Game state
let gameState = {
    tests: [],
    totalTests: 20,
    currentTest: 0
};

// Color generation utilities
function generateBoundaryColor() {
    const hue = Math.round(Math.random() * 60 - 30); // -30 to 30 (around red)
    const saturation = Math.round(Math.random() * 30 + 70); // 70-100%
    const lightness = 50; // Fixed for better visualization
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function startGame() {
    document.getElementById('gameMenu').classList.add('hidden');
    document.getElementById('gameArea').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    initTest();
}

function initTest() {
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = `
        <div class="boundary-test">
            <h2>Is this color "red"?</h2>
            <div class="test-count">Test ${gameState.currentTest + 1} of ${gameState.totalTests}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(gameState.currentTest / gameState.totalTests) * 100}%"></div>
            </div>
            <div class="color-swatch" id="boundaryColor"></div>
            <div class="boundary-controls">
                <button class="boundary-btn" id="yesBtn">Yes, it's red</button>
                <button class="boundary-btn" id="noBtn">No, it's not red</button>
            </div>
        </div>
    `;
    startNewTest();
}

function startNewTest() {
    const color = generateBoundaryColor();
    document.getElementById('boundaryColor').style.backgroundColor = color;
    
    // Update test count display
    document.querySelector('.test-count').textContent = `Test ${gameState.currentTest + 1} of ${gameState.totalTests}`;

    document.getElementById('yesBtn').onclick = () => endTest(color, true);
    document.getElementById('noBtn').onclick = () => endTest(color, false);
}

function endTest(color, isRed) {
    gameState.tests.push({ color, isRed });
    gameState.currentTest++;

    if (gameState.currentTest < gameState.totalTests) {
        startNewTest();
    } else {
        showResults();
    }
}

function showResults() {
    document.getElementById('gameArea').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    
    // Update stats
    const redCount = gameState.tests.filter(test => test.isRed).length;
    document.getElementById('totalTests').textContent = gameState.totalTests;
    document.getElementById('redCount').textContent = redCount;
    
    // Calculate red range
    const redHues = gameState.tests
        .filter(test => test.isRed)
        .map(test => {
            const hslMatch = test.color.match(/hsl\(([-\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
            return parseFloat(hslMatch[1]);
        });
    const redRange = Math.max(...redHues) - Math.min(...redHues);
    document.getElementById('redRange').textContent = Math.round(redRange);

    generateBoundaryMap();
}

function calculatePolygonArea(points) {
    let area = 0;
    const n = points.length;
    
    // Using the Shoelace formula (also known as surveyor's formula)
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area / 2);
}

function generateBoundaryMap() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const map = document.getElementById('boundaryMap');
    
    // Clear previous canvas if it exists
    map.innerHTML = '';
    
    // Set canvas size
    canvas.width = map.clientWidth;
    canvas.height = map.clientHeight;
    map.appendChild(canvas);

    // Create a grid of colors
    const gridSize = 60;
    
    // Draw the background color grid
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const hue = i - 30;
            const sat = 100 - (j / gridSize * 30);
            const light = 50;
            const color = `hsl(${hue}, ${sat}%, ${light}%)`;

            const x = (i * canvas.width) / gridSize;
            const y = (j * canvas.height) / gridSize;
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, canvas.width / gridSize + 1, canvas.height / gridSize + 1);
        }
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i += 5) {
        ctx.beginPath();
        ctx.moveTo((i * canvas.width) / gridSize, 0);
        ctx.lineTo((i * canvas.width) / gridSize, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, (i * canvas.height) / gridSize);
        ctx.lineTo(canvas.width, (i * canvas.height) / gridSize);
        ctx.stroke();
    }

    // Extract color values and map coordinates for all test points
    const testPoints = gameState.tests.map(test => {
        // Extract hue value from HSL string, handling negative values
        const hslMatch = test.color.match(/hsl\(([-\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
        const hue = parseFloat(hslMatch[1]);
        const sat = parseFloat(hslMatch[2]);
        
        // Map coordinates to canvas
        const x = ((hue + 30) * canvas.width) / 60;
        const y = ((100 - sat) * canvas.height) / 30;
        
        return { x, y, isRed: test.isRed, hue, sat };
    });

    // Draw all test points
    testPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = point.isRed ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Get red points for boundary
    const redPoints = testPoints.filter(point => point.isRed);

    // Draw the boundary polygon if we have enough points
    if (redPoints.length >= 3) {
        // Create convex hull
        const boundaryPoints = simplifyBoundary(redPoints);
        
        // Draw the polygon
        ctx.beginPath();
        ctx.moveTo(boundaryPoints[0].x, boundaryPoints[0].y);
        for (let i = 1; i < boundaryPoints.length; i++) {
            ctx.lineTo(boundaryPoints[i].x, boundaryPoints[i].y);
        }
        ctx.lineTo(boundaryPoints[0].x, boundaryPoints[0].y); // Close the polygon
        
        // Fill with semi-transparent red
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Calculate and display the red area percentage
        const polygonArea = calculatePolygonArea(boundaryPoints);
        const totalArea = canvas.width * canvas.height;
        const areaPercentage = Math.round((polygonArea / totalArea) * 100);
        
        // Update the DOM with the area percentage
        const redAreaSpan = document.createElement('p');
        redAreaSpan.innerHTML = `Red area coverage: <strong>${areaPercentage}%</strong>`;
        document.querySelector('.stats').appendChild(redAreaSpan);
    }

    // Add axes labels
    ctx.fillStyle = 'black';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels (Hue)
    ctx.fillText('-30°', 30, canvas.height - 10);
    ctx.fillText('0°', canvas.width/2, canvas.height - 10);
    ctx.fillText('+30°', canvas.width - 30, canvas.height - 10);
    
    // Y-axis labels (Saturation)
    ctx.textAlign = 'right';
    ctx.fillText('70%', 25, canvas.height - 20);
    ctx.fillText('100%', 25, 30);
}

function simplifyBoundary(points) {
    // Graham Scan algorithm for convex hull
    if (points.length < 3) return points;
    
    // Find the bottommost point
    let bottom = points[0];
    for (let i = 1; i < points.length; i++) {
        if (points[i].y > bottom.y || 
            (points[i].y === bottom.y && points[i].x < bottom.x)) {
            bottom = points[i];
        }
    }
    
    // Sort points based on polar angle
    points.sort((a, b) => {
        const angleA = Math.atan2(a.y - bottom.y, a.x - bottom.x);
        const angleB = Math.atan2(b.y - bottom.y, b.x - bottom.x);
        return angleA - angleB;
    });
    
    // Build convex hull
    const hull = [bottom];
    for (let i = 1; i < points.length; i++) {
        while (hull.length >= 2 && 
               !isCounterClockwise(hull[hull.length - 2], hull[hull.length - 1], points[i])) {
            hull.pop();
        }
        hull.push(points[i]);
    }
    
    return hull;
}

function isCounterClockwise(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) > 0;
}

function predictRed(hue, sat, light) {
    let redVotes = 0;
    let totalVotes = 0;

    gameState.tests.forEach(test => {
        const [testHue, testSat, testLight] = test.color.match(/\d+/g).map(Number);
        
        // Calculate color distance with weighted components
        const hueDiff = Math.abs(hue - testHue) * 2; // Weight hue more heavily
        const satDiff = Math.abs(sat - testSat);
        const lightDiff = Math.abs(light - testLight);
        
        // Weight closer colors more heavily
        const weight = 1 / (hueDiff + satDiff + lightDiff);
        
        if (test.isRed) redVotes += weight;
        totalVotes += weight;
    });

    return redVotes / totalVotes > 0.5;
}

function resetGame() {
    gameState = {
        tests: [],
        totalTests: 20,
        currentTest: 0
    };
    document.getElementById('results').classList.add('hidden');
    document.getElementById('gameMenu').classList.remove('hidden');
} 