// 遊戲狀態
let gameState = {
    geoData: null,
    pathDataCache: new Map(),
    questions: [],
    currentIndex: 0,
    correctAnswers: new Set(),
    startTime: null,
    timerInterval: null,
    currentQuestion: null
};

// 顏色配置
const COLORS = [
    '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA',
    '#FCBAD3', '#FFFFD2', '#A8D8EA', '#FFAAA5', '#FFD3B6',
    '#DCEDC1', '#A8E6CF', '#FFD6A5', '#FDCAE1', '#C7CEEA',
    '#B5EAD7', '#FFDAC1', '#FF9AA2', '#E2F0CB', '#B4F8C8',
    '#FBE7C6', '#A0E7E5'
];

// 初始化遊戲
function initGame() {
    // 將 TopoJSON 轉換為 GeoJSON
    gameState.geoData = topojson.feature(TAIWAN_TOPOJSON, TAIWAN_TOPOJSON.objects.map);
    
    // 預先生成所有路徑資料並快取
    gameState.pathDataCache.clear();
    gameState.geoData.features.forEach(feature => {
        const pathData = geoToPath(feature.geometry.coordinates, feature.geometry.type);
        gameState.pathDataCache.set(feature.properties.id, pathData);
    });
    
    // 建立題目列表並隨機排序
    gameState.questions = [...gameState.geoData.features].sort(() => Math.random() - 0.5);
    gameState.currentIndex = 0;
    gameState.correctAnswers.clear();
    
    renderMiniMap();
    showQuestion();
    setupEventListeners();
    startTimer();
}

// 將 GeoJSON 座標轉換為 SVG 路徑
function geoToPath(coordinates, type) {
    const bounds = getBounds(gameState.geoData);
    const width = 600;
    const height = 700;
    const padding = 20;
    
    const scaleX = (width - 2 * padding) / (bounds.maxX - bounds.minX);
    const scaleY = (height - 2 * padding) / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = padding + (width - 2 * padding - (bounds.maxX - bounds.minX) * scale) / 2;
    const offsetY = padding;
    
    function projectPoint([lon, lat]) {
        const x = (lon - bounds.minX) * scale + offsetX;
        const y = height - ((lat - bounds.minY) * scale + offsetY);
        return [x, y];
    }
    
    function ringToPath(ring) {
        return ring.map((point, i) => {
            const [x, y] = projectPoint(point);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ') + ' Z';
    }
    
    if (type === 'Polygon') {
        return coordinates.map(ringToPath).join(' ');
    } else if (type === 'MultiPolygon') {
        return coordinates.map(polygon => 
            polygon.map(ringToPath).join(' ')
        ).join(' ');
    }
    return '';
}

// 計算地圖邊界
function getBounds(geoData) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    geoData.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        
        function processCoords(c) {
            if (typeof c[0] === 'number') {
                minX = Math.min(minX, c[0]);
                maxX = Math.max(maxX, c[0]);
                minY = Math.min(minY, c[1]);
                maxY = Math.max(maxY, c[1]);
            } else {
                c.forEach(processCoords);
            }
        }
        
        processCoords(coords);
    });
    
    return { minX, minY, maxX, maxY };
}

// 渲染小地圖
function renderMiniMap() {
    const svg = document.getElementById('mini-map');
    svg.innerHTML = '';

    gameState.geoData.features.forEach((feature, index) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = gameState.pathDataCache.get(feature.properties.id);
        
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'mini-county');
        path.setAttribute('data-county-id', feature.properties.id);
        path.setAttribute('fill', 'rgba(200, 200, 200, 0.3)');
        path.setAttribute('stroke', '#999');
        path.setAttribute('stroke-width', '1');
        
        svg.appendChild(path);
    });
}

// 顯示題目
function showQuestion() {
    if (gameState.currentIndex >= gameState.questions.length) {
        // 所有題目完成
        stopTimer();
        showVictoryModal();
        return;
    }
    
    gameState.currentQuestion = gameState.questions[gameState.currentIndex];
    
    // 顯示縣市輪廓
    const svg = document.getElementById('question-svg');
    svg.innerHTML = '';
    
    const pathData = gameState.pathDataCache.get(gameState.currentQuestion.properties.id);
    
    // 計算路徑的邊界框
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tempSvg.setAttribute('width', '600');
    tempSvg.setAttribute('height', '700');
    tempSvg.style.position = 'absolute';
    tempSvg.style.visibility = 'hidden';
    
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', pathData);
    tempSvg.appendChild(tempPath);
    document.body.appendChild(tempSvg);
    
    const bbox = tempPath.getBBox();
    document.body.removeChild(tempSvg);
    
    // 設置 viewBox 以填滿顯示區域
    const padding = 20;
    const viewBoxX = bbox.x - padding;
    const viewBoxY = bbox.y - padding;
    const viewBoxWidth = bbox.width + padding * 2;
    const viewBoxHeight = bbox.height + padding * 2;
    
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // 找到該縣市在原始資料中的索引，確保顏色一致
    const countyIndex = gameState.geoData.features.findIndex(
        f => f.properties.id === gameState.currentQuestion.properties.id
    );
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', COLORS[countyIndex % COLORS.length]);
    path.setAttribute('stroke', '#333');
    path.setAttribute('stroke-width', '1');
    
    svg.appendChild(path);
    
    // 生成選項
    generateOptions();
    
    // 更新進度
    updateProgress();
}

// 生成選項按鈕
function generateOptions() {
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    const correctAnswer = gameState.currentQuestion.properties.name;
    const correctId = gameState.currentQuestion.properties.id;
    
    // 選擇 5 個干擾選項
    const allCounties = gameState.geoData.features.filter(f => f.properties.id !== correctId);
    const distractors = [];
    
    while (distractors.length < 5 && distractors.length < allCounties.length) {
        const random = allCounties[Math.floor(Math.random() * allCounties.length)];
        if (!distractors.find(d => d.properties.id === random.properties.id)) {
            distractors.push(random);
        }
    }
    
    // 組合所有選項並打亂
    const options = [
        { name: correctAnswer, id: correctId, isCorrect: true },
        ...distractors.map(d => ({ name: d.properties.name, id: d.properties.id, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);
    
    // 創建按鈕
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option.name;
        button.setAttribute('data-county-id', option.id);
        button.setAttribute('data-correct', option.isCorrect);
        
        button.addEventListener('click', () => checkAnswer(button));
        
        container.appendChild(button);
    });
}

// 檢查答案
function checkAnswer(button) {
    const isCorrect = button.getAttribute('data-correct') === 'true';
    const allButtons = document.querySelectorAll('.option-btn');
    
    // 禁用所有按鈕
    allButtons.forEach(btn => btn.disabled = true);
    
    if (isCorrect) {
        // 答對
        button.classList.add('correct');
        showFeedback('✓ 答對了！', 'correct');
        
        // 標記為已完成
        const countyId = gameState.currentQuestion.properties.id;
        gameState.correctAnswers.add(countyId);
        
        // 填充小地圖
        fillMiniMap(countyId);
        
        // 1.5 秒後顯示下一題
        setTimeout(() => {
            gameState.currentIndex++;
            showQuestion();
        }, 1500);
    } else {
        // 答錯
        button.classList.add('wrong');
        showFeedback('✗ 答錯了，再試一次！', 'wrong');
        
        // 1 秒後重新啟用按鈕
        setTimeout(() => {
            button.classList.remove('wrong');
            allButtons.forEach(btn => btn.disabled = false);
        }, 1000);
    }
}

// 填充小地圖
function fillMiniMap(countyId) {
    const miniMap = document.getElementById('mini-map');
    const county = miniMap.querySelector(`[data-county-id="${countyId}"]`);
    
    if (county) {
        const index = Array.from(gameState.geoData.features).findIndex(f => f.properties.id === countyId);
        county.setAttribute('fill', COLORS[index % COLORS.length]);
        county.setAttribute('stroke', '#333');
        county.setAttribute('stroke-width', '2');
        county.classList.add('completed');
    }
}

// 顯示反饋訊息
function showFeedback(message, type = 'correct') {
    const oldFeedback = document.querySelector('.feedback-message');
    if (oldFeedback) {
        oldFeedback.remove();
    }
    
    const feedback = document.createElement('div');
    feedback.className = `feedback-message feedback-${type}`;
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.classList.add('fade-out');
        setTimeout(() => feedback.remove(), 300);
    }, 1000);
}

// 更新進度
function updateProgress() {
    document.getElementById('progress-count').textContent = gameState.correctAnswers.size;
    document.getElementById('total-count').textContent = gameState.questions.length;
}

// 顯示勝利彈窗
function showVictoryModal() {
    const modal = document.getElementById('victory-modal');
    const finalTime = document.getElementById('final-time');
    const timerText = document.getElementById('timer').textContent;
    
    finalTime.textContent = timerText;
    modal.classList.remove('hidden');
}

// 計時器
function startTimer() {
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// 設置事件監聽器
function setupEventListeners() {
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('play-again-btn').addEventListener('click', resetGame);
}

// 重置遊戲
function resetGame() {
    stopTimer();
    document.getElementById('victory-modal').classList.add('hidden');
    initGame();
}

// 頁面載入時初始化
window.addEventListener('DOMContentLoaded', initGame);
