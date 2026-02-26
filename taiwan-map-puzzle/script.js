// 遊戲狀態
let gameState = {
    geoData: null,
    pathDataCache: new Map(),
    questions: [],
    currentIndex: 0,
    correctAnswers: new Set(),
    startTime: null,
    timerInterval: null,
    currentQuestion: null,
    difficulty: 'lv1' // 預設難度
};

// 顏色配置
const COLORS = [
    '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA',
    '#FCBAD3', '#FFFFD2', '#A8D8EA', '#FFAAA5', '#FFD3B6',
    '#DCEDC1', '#A8E6CF', '#FFD6A5', '#FDCAE1', '#C7CEEA',
    '#B5EAD7', '#FFDAC1', '#FF9AA2', '#E2F0CB', '#B4F8C8',
    '#FBE7C6', '#A0E7E5'
];

// 區域定義 (用於 LV1, LV2)
const REGION_MAP = {
    // LV1: 北、中、南、東、離島 (5大區)
    lv1: {
        '北部地區': ['基隆市', '台北市', '新北市', '桃園市', '新竹縣', '新竹市', '宜蘭縣'],
        '中部地區': ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
        '南部地區': ['嘉義縣', '嘉義市', '台南市', '高雄市', '屏東縣'],
        '東部地區': ['花蓮縣', '台東縣'],
        '離島地區': ['澎湖縣', '金門縣', '連江縣']
    },
    // LV2: 稍細一點的劃分 (10區)
    lv2: {
        '北北基宜': ['基隆市', '台北市', '新北市', '宜蘭縣'],
        '桃竹苗': ['桃園市', '新竹縣', '新竹市', '苗栗縣'],
        '中彰投': ['台中市', '彰化縣', '南投縣'],
        '雲嘉南': ['雲林縣', '嘉義縣', '嘉義市', '台南市'],
        '高屏': ['高雄市', '屏東縣'],
        '花東': ['花蓮縣', '台東縣'],
        '澎湖': ['澎湖縣'],
        '金門': ['金門縣'],
        '馬祖': ['連江縣']
    }
};

// 初始化遊戲
function initGame() {
    // 解析難度
    const urlParams = new URLSearchParams(window.location.search);
    gameState.difficulty = urlParams.get('diff') || 'lv1';
    
    // 更新標題顯示難度
    const diffNames = { lv1: '初級', lv2: '中級', lv3: '高級', lv4: '專業級' };
    document.querySelector('h1').textContent = `台灣地圖挑戰 (${diffNames[gameState.difficulty]})`;

    // 處理地理資料
    processMapData();
    
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

// 根據難度處理地圖資料
function processMapData() {
    if (gameState.difficulty === 'lv1' || gameState.difficulty === 'lv2') {
        const currentRegionDef = REGION_MAP[gameState.difficulty];
        const newFeatures = [];
        const topoObjects = TAIWAN_TOPOJSON.objects.map;

        Object.entries(currentRegionDef).forEach(([regionName, counties], index) => {
            // 找到對應的 TopoJSON geometries
            const geometries = topoObjects.geometries.filter(g => counties.includes(g.properties.name));
            if (geometries.length > 0) {
                const merged = topojson.merge(TAIWAN_TOPOJSON, geometries);
                newFeatures.push({
                    type: 'Feature',
                    geometry: merged,
                    properties: {
                        id: `region-${index}`,
                        name: regionName
                    }
                });
            }
        });
        gameState.geoData = { type: 'FeatureCollection', features: newFeatures };
    } else {
        // LV3, LV4 使用原始縣市資料
        gameState.geoData = topojson.feature(TAIWAN_TOPOJSON, TAIWAN_TOPOJSON.objects.map);
    }
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

    // SVG container should always be visible to show content correctly
    svg.style.opacity = '1';

    gameState.geoData.features.forEach((feature, index) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = gameState.pathDataCache.get(feature.properties.id);
        
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'mini-county');
        path.setAttribute('data-county-id', feature.properties.id);
        path.setAttribute('fill', 'rgba(200, 200, 200, 0.3)');
        path.setAttribute('stroke', '#999');
        path.setAttribute('stroke-width', '1');
        
        // LV4 盲拼模式：初始隱藏未完成的路徑
        if (gameState.difficulty === 'lv4') {
            path.style.opacity = '0';
        }
        
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
    
    // 難度越高，干擾項越多
    let distractorCount = 3;
    if (gameState.difficulty === 'lv2') distractorCount = 4;
    if (gameState.difficulty === 'lv3' || gameState.difficulty === 'lv4') distractorCount = 5;

    const allCounties = gameState.geoData.features.filter(f => f.properties.id !== correctId);
    const distractors = [];
    
    while (distractors.length < distractorCount && distractors.length < allCounties.length) {
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
        // 答對才能顯眼，答錯回饋
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
        
        // LV4 盲拼模式：完成時才明顯顯示
        if (gameState.difficulty === 'lv4') {
            county.style.opacity = '1';
        }
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
