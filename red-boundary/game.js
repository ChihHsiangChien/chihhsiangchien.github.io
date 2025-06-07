// 在文件開頭添加導出聲明
export { startGame, resetGame };

// Game state
let gameState = {
    tests: [],
    currentTest: 0,
    minTests: 30,    // 最少測試數量
    maxTests: 50,    // 最多測試數量
    colorPool: [],   // 儲存預生成的顏色
    testedColors: new Set(), // 記錄已測試的顏色
    boundaryConfidence: 0,    // 邊界確定度
    lastIsRed: null,  // 記錄上一次用戶的選擇
    redThreshold: 0,  // 紅色閾值，用於調整顏色生成
    currentGridSize: 6  // 初始網格大小
};

// Firebase 配置和初始化
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnWXmKCDSf9uuN1Gl6Id_p5ME-2lsl89w",
    authDomain: "red-boundary-test.firebaseapp.com",
    projectId: "red-boundary-test",
    storageBucket: "red-boundary-test.firebasestorage.app",
    messagingSenderId: "96092389524",
    appId: "1:96092389524:web:0cfd09c36b6deaa6207481",
    measurementId: "G-3R1VDGFBJV"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Color generation utilities
function generateColorPool() {
    const pool = [];
    const gridSize = gameState.currentGridSize;
    
    // 在色相-飽和度空間中生成規則網格
    for (let h = 0; h < gridSize; h++) {
        for (let s = 0; s < gridSize; s++) {
            // 將網格位置映射到實際的色相和飽和度值
            const hue = -30 + (60 * h / (gridSize - 1));
            const saturation = 70 + (30 * s / (gridSize - 1));
            
            pool.push({
                hue: hue,
                saturation: saturation,
                weight: 1.0  // 初始權重
            });
        }
    }
    
    return pool;
}

function parseHSL(colorStr) {
    const matches = colorStr.match(/hsl\(([-\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!matches) return null;
    return {
        hue: parseFloat(matches[1]),
        saturation: parseFloat(matches[2]),
        lightness: parseFloat(matches[3])
    };
}

function shouldContinueTesting() {
    if (gameState.currentTest < gameState.minTests) return true;
    if (gameState.currentTest >= gameState.maxTests) return false;
    
    // 如果測試數量夠多，檢查邊界的確定度
    if (gameState.currentTest >= gameState.minTests) {
        // 計算最近幾次測試的一致性
        const recentTests = gameState.tests.slice(-5);
        let consistencyScore = 0;
        
        recentTests.forEach((test, i) => {
            if (i === 0) return;
            const prevTest = recentTests[i - 1];
            const prevColor = parseHSL(prevTest.color);
            const currentColor = parseHSL(test.color);
            
            if (!prevColor || !currentColor) return;
            
            // 如果相鄰測試結果一致，增加分數
            if (Math.abs(prevColor.hue - currentColor.hue) < 10 && test.isRed === prevTest.isRed) {
                consistencyScore += 1;
            }
        });
        
        // 更新邊界確定度
        gameState.boundaryConfidence = consistencyScore / 4; // 歸一化到0-1
        
        // 如果確定度較高，可以提前結束
        return gameState.boundaryConfidence < 0.7;
    }
    
    return true;
}

function generateBoundaryColor() {
    if (gameState.colorPool.length === 0) {
        gameState.colorPool = generateColorPool();
        gameState.testedColors.clear();
    }

    // 根据上一次的选择调整颜色权重
    if (gameState.lastIsRed !== null && gameState.tests.length > 0) {
        const lastTest = gameState.tests[gameState.tests.length - 1];
        const lastColor = parseHSL(lastTest.color);
        
        gameState.colorPool.forEach(color => {
            // 計算與上一個測試顏色的距離
            const hueDiff = Math.abs(color.hue - lastColor.hue);
            const satDiff = Math.abs(color.saturation - lastColor.saturation);
            const distance = Math.sqrt(hueDiff * hueDiff + satDiff * satDiff);
            
            if (gameState.lastIsRed) {
                // 如果上一个是紅色，增加相似顏色的權重
                if (distance < 15) {
                    color.weight *= 1.2;
                }
            } else {
                // 如果上一個不是紅色，減少相似顏色的權重
                if (distance < 15) {
                    color.weight *= 0.8;
                }
            }
            
            // 確保權重在合理範圍內
            color.weight = Math.max(0.1, Math.min(2.0, color.weight));
        });
    }

    // 使用權重隨機選擇顏色
    let totalWeight = 0;
    const availableColors = gameState.colorPool.filter((_, index) => !gameState.testedColors.has(index));
    
    availableColors.forEach(color => {
        totalWeight += color.weight;
    });

    let randomWeight = Math.random() * totalWeight;
    let selectedIndex = 0;
    
    for (let i = 0; i < availableColors.length; i++) {
        randomWeight -= availableColors[i].weight;
        if (randomWeight <= 0) {
            selectedIndex = i;
            break;
        }
    }

    // 找到選中顏色在原始colorPool中的索引
    const originalIndex = gameState.colorPool.indexOf(availableColors[selectedIndex]);
    gameState.testedColors.add(originalIndex);
    
    const selectedColor = availableColors[selectedIndex];
    return `hsl(${selectedColor.hue}, ${selectedColor.saturation}%, 50%)`;
}

function startGame() {
    // 初始化顏色池
    gameState.colorPool = generateColorPool();
    gameState.testedColors = new Set();
    
    document.getElementById('gameMenu').classList.add('hidden');
    document.getElementById('gameArea').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    initTest();
}

function initTest() {
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = `
        <div class="boundary-test">
            <h2>你會叫這個是「紅色」嗎？?</h2>
            <div class="test-count">Test ${gameState.currentTest + 1} of ${gameState.maxTests}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(gameState.currentTest / gameState.maxTests) * 100}%"></div>
            </div>
            <div class="color-swatch" id="boundaryColor"></div>
            <div class="boundary-controls">
                <button class="boundary-btn" id="noBtn">No ←</button>
                <button class="boundary-btn" id="yesBtn">Yes →</button>
            </div>
            <div class="keyboard-hint">可以使用 ← → 方向鍵回答</div>
        </div>
    `;
    startNewTest();
}

function startNewTest() {
    const color = generateBoundaryColor();
    document.getElementById('boundaryColor').style.backgroundColor = color;
    
    // Update test count display
    document.querySelector('.test-count').textContent = `Test ${gameState.currentTest + 1} of ${gameState.maxTests}`;

    // 添加按钮点击事件
    document.getElementById('yesBtn').onclick = () => endTest(color, true);
    document.getElementById('noBtn').onclick = () => endTest(color, false);

    // 添加键盘事件监听
    const handleKeyPress = (event) => {
        if (event.key === 'ArrowLeft') {
            // 左方向键 = No
            endTest(color, false);
            document.getElementById('noBtn').classList.add('active');
            setTimeout(() => document.getElementById('noBtn').classList.remove('active'), 200);
        } else if (event.key === 'ArrowRight') {
            // 右方向键 = Yes
            endTest(color, true);
            document.getElementById('yesBtn').classList.add('active');
            setTimeout(() => document.getElementById('yesBtn').classList.remove('active'), 200);
        }
    };

    // 移除之前的鍵盤事件監聽器（如果存在）
    if (window.currentKeyListener) {
        document.removeEventListener('keydown', window.currentKeyListener);
    }
    
    // 保存當前的鍵盤事件監聽器引用
    window.currentKeyListener = handleKeyPress;
    document.addEventListener('keydown', handleKeyPress);
}

function endTest(color, isRed) {
    // 移除鍵盤事件監聽器
    if (window.currentKeyListener) {
        document.removeEventListener('keydown', window.currentKeyListener);
        window.currentKeyListener = null;
    }

    gameState.lastIsRed = isRed;  // 記錄這次的选择
    gameState.tests.push({ color, isRed });
    gameState.currentTest++;

    // 如果測試次數達到一定數量，增加網格大小以獲得更精細的顏色
    if (gameState.currentTest === Math.floor(gameState.maxTests / 2)) {
        gameState.currentGridSize = 8;  // 增加網格大小
        gameState.colorPool = generateColorPool();  // 重新生成顏色池
        gameState.testedColors.clear();
    }

    if (shouldContinueTesting()) {
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
    document.getElementById('totalTests').textContent = gameState.currentTest;
    document.getElementById('redCount').textContent = redCount;
    
    // Calculate red range
    const redHues = gameState.tests
        .filter(test => test.isRed)
        .map(test => {
            const color = parseHSL(test.color);
            return color ? color.hue : 0;
        })
        .filter(hue => hue !== 0);
    
    const redRange = redHues.length > 0 ? Math.max(...redHues) - Math.min(...redHues) : 0;
    document.getElementById('redRange').textContent = Math.round(redRange);

    // 生成邊界地圖
    generateBoundaryMap();

    // 添加人口統計訊息收集界面
    const demographicsDiv = document.createElement('div');
    demographicsDiv.className = 'demographics-container';
    demographicsDiv.innerHTML = `
        <div class="demographics-form">
            <h3>請提供一些基本資料</h3>
            <div class="form-group">
                <label>性別：</label>
                <div class="button-group">
                    <button class="demo-btn" data-gender="male">男性</button>
                    <button class="demo-btn" data-gender="female">女性</button>
                    <button class="demo-btn" data-gender="other">其他</button>
                </div>
            </div>
            <div class="form-group">
                <label>年齡範圍：</label>
                <div class="button-group">
                    <button class="demo-btn" data-age="under20">20歲以下</button>
                    <button class="demo-btn" data-age="20-29">20-29歲</button>
                    <button class="demo-btn" data-age="30-39">30-39歲</button>
                    <button class="demo-btn" data-age="40-49">40-49歲</button>
                    <button class="demo-btn" data-age="50plus">50歲以上</button>
                </div>
            </div>
            <button id="submitDemographics" class="submit-btn" disabled>提交結果</button>
        </div>
    `;

    document.getElementById('results').appendChild(demographicsDiv);

    // 添加樣式
    const style = document.createElement('style');
    style.textContent = `
        .demographics-container {
            margin-top: 20px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 8px;
        }
        .demographics-form {
            max-width: 500px;
            margin: 0 auto;
        }
        .form-group {
            margin: 15px 0;
        }
        .button-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 8px;
        }
        .demo-btn {
            padding: 8px 16px;
            border: 2px solid #ddd;
            border-radius: 20px;
            background: white;
            cursor: pointer;
            transition: all 0.3s;
        }
        .demo-btn.selected {
            background: #007bff;
            color: white;
            border-color: #0056b3;
        }
        .submit-btn {
            width: 100%;
            padding: 12px;
            margin-top: 20px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        .submit-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);

    // 添加事件監聽器
    let selectedGender = null;
    let selectedAge = null;

    // 性別選擇
    document.querySelectorAll('[data-gender]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('[data-gender]').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedGender = button.dataset.gender;
            checkFormComplete();
        });
    });

    // 年齡選擇
    document.querySelectorAll('[data-age]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('[data-age]').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedAge = button.dataset.age;
            checkFormComplete();
        });
    });

    // 檢查表單是否完整
    function checkFormComplete() {
        const submitButton = document.getElementById('submitDemographics');
        submitButton.disabled = !(selectedGender && selectedAge);
    }

    // 提交按鈕事件
    document.getElementById('submitDemographics').addEventListener('click', async () => {
        const testData = {
            gender: selectedGender,
            ageRange: selectedAge,
            tests: gameState.tests.map(test => ({
                color: test.color,
                isRed: test.isRed
            })),
            redCount: redCount,
            redRange: redRange,
            totalTests: gameState.currentTest,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        try {
            const docRef = await addDoc(collection(db, 'redBoundaryTests'), testData);
            console.log('Document written with ID: ', docRef.id);
            alert('感謝您的參與！');
            // 禁用提交按鈕防止重複提交
            document.getElementById('submitDemographics').disabled = true;
            document.getElementById('submitDemographics').textContent = '已提交';
        } catch (error) {
            console.error('Error adding document: ', error);
            alert('提交失敗，請稍後再試');
        }
    });
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
        redAreaSpan.innerHTML = `紅色區域覆蓋率: <strong>${areaPercentage}%</strong>`;
        document.querySelector('.stats').appendChild(redAreaSpan);
    }

    // Add axes labels
    ctx.fillStyle = 'black';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels (Hue)
    ctx.fillText('-30°', 30, canvas.height - 10);
    ctx.fillText('0°', canvas.width/2, canvas.height - 5);
    ctx.fillText('+30°', canvas.width - 30, canvas.height - 5);
    
    // Y-axis labels (Saturation)
    ctx.textAlign = 'right';
    ctx.fillText('70%', 50, canvas.height - 20);
    ctx.fillText('100%', 50, 30);
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
        const color = parseHSL(test.color);
        if (!color) return;
        
        // Calculate color distance with weighted components
        const hueDiff = Math.abs(hue - color.hue) * 2; // Weight hue more heavily
        const satDiff = Math.abs(sat - color.saturation);
        const lightDiff = Math.abs(light - color.lightness);
        
        // Weight closer colors more heavily
        const weight = 1 / (hueDiff + satDiff + lightDiff);
        
        if (test.isRed) redVotes += weight;
        totalVotes += weight;
    });

    return totalVotes > 0 ? redVotes / totalVotes > 0.5 : false;
}

function resetGame() {
    gameState = {
        tests: [],
        currentTest: 0,
        minTests: 15,
        maxTests: 30,
        colorPool: [],
        testedColors: new Set(),
        boundaryConfidence: 0,
        lastIsRed: null,
        redThreshold: 0,
        currentGridSize: 6
    };
    
    // 移除之前的人口統計表單（如果存在）
    const demographicsContainer = document.querySelector('.demographics-container');
    if (demographicsContainer) {
        demographicsContainer.remove();
    }
    
    document.getElementById('results').classList.add('hidden');
    document.getElementById('gameMenu').classList.remove('hidden');
}

// 在文件開頭添加樣式
const style = document.createElement('style');
style.textContent = `
    .boundary-btn.active {
        transform: scale(0.95);
        background-color: #666;
    }
    .keyboard-hint {
        text-align: center;
        margin-top: 10px;
        color: #666;
        font-size: 14px;
    }
`;
document.head.appendChild(style); 