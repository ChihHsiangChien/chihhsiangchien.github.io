// --- 基本設定 ---
let scene, camera, renderer, controls;
let container, infoLevelText, loadingElement;

// --- 統一的數據模型 ---
const dnaStructure = {
    chromosome: {
        curve: null,      // 染色體的主曲線
        length: 50,       // 染色體長度
        group: null       // Three.js組對象
    },
    nucleosomes: {
        count: 20,         // 核小體數量
        positions: [],    // 核小體位置數組
        group: null       // Three.js組對象
    },
    dna: {
        positions: [],    // DNA雙螺旋在各核小體位置的映射
        group: null       // Three.js組對象
    }
};

// --- 狀態變數 ---
let currentLevel = 'chromosome'; // 'chromosome', 'nucleosome', 'dna'
const zoomThresholds = {
    toNucleosome: 15, // 從染色體縮放到此距離時，切換到核小體
    toDna: 3,         // 從核小體縮放到此距離時，切換到 DNA
};
let isTransitioning = false; // 防止過渡動畫期間觸發新的過渡

// --- 初始化 ---
function init() {
    container = document.getElementById('container');
    infoLevelText = document.getElementById('level-text');
    loadingElement = document.getElementById('loading');

    // 場景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2a); // 深藍紫色背景

    // 相機
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50; // 初始相機距離

    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // 光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // 控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 啟用阻尼效果，讓旋轉更平滑
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false; // true: 右鍵平移；false: 中鍵平移 (或Shift+左鍵)
    controls.minDistance = 0.5; // 最小縮放距離
    controls.maxDistance = 100; // 最大縮放距離
    controls.target.set(0, 0, 0); // 控制器對準場景中心

    // --- 創建模型 ---
    createChromosome();
    createNucleosomes();
    createDNA();

    // 初始隱藏非染色體層級
    dnaStructure.nucleosomes.group.visible = false;
    dnaStructure.dna.group.visible = false;

    // --- 事件監聽 ---
    window.addEventListener('resize', onWindowResize, false);
    controls.addEventListener('change', onControlsChange); // 監聽控制器變化 (包含縮放)

    // --- 隱藏載入提示 ---
    loadingElement.style.display = 'none';

    // --- 初始界面更新 ---
    updateInfo();

    // --- 開始動畫循環 ---
    animate();
}

// --- 創建染色體 (簡化表示) ---
function createChromosome() {
    dnaStructure.chromosome.group = new THREE.Group();
    
    // 創建染色體DNA材質
    const dnaMaterial = new THREE.MeshStandardMaterial({
        color: 0xff9988, // 紅色DNA
        roughness: 0.6,
        metalness: 0.1,
        transparent: true // 啟用透明度以便動畫
    });

    // 基於圖片所示的電話線超螺旋結構
    const points = [];
    const height = dnaStructure.chromosome.length; // 染色體高度
    
    // 定義參數
    const baseSpiralTurns = 100; // 基本螺旋數（電話線本身的螺旋）
    const supercoilTwists = 10; // 超螺旋扭轉次數 (Z字型纏繞)
    const pointsPerTurn = 10; // 每圈的點數
    const totalPoints = baseSpiralTurns * pointsPerTurn; // 總點數
    
    // 定義基本螺旋參數
    const baseRadius = 1.5; // 基本螺旋半徑
    const supercoilRadius = 3.0; // 超螺旋半徑
    
    // 創建形似圖片中的超螺旋結構
    for (let i = 0; i < totalPoints; i++) {
        const t = i / totalPoints; // 0到1的參數
        
        // 基本螺旋參數 (細小的電話線螺旋)
        const baseAngle = t * Math.PI * 2 * baseSpiralTurns;
        
        // 超螺旋參數 (整體的Z型扭曲)
        const supercoilAngle = t * Math.PI * 2 * supercoilTwists;
        const supercoilPhase = Math.sin(supercoilAngle);
        
        // 構建主路徑 - 這是一條S形路徑
        const pathX = supercoilRadius * supercoilPhase;
        const pathY = height * (t - 0.5); // 中心對齊
        const pathZ = 0;
        
        // 構建基本螺旋 - 圍繞主路徑
        // 使用不同的半徑在x和z方向，創建橢圓形橫截面
        const localX = baseRadius * Math.cos(baseAngle);
        const localZ = baseRadius * Math.sin(baseAngle);
        
        // 根據超螺旋相位旋轉基本螺旋，使其跟隨主路徑的轉彎
        const rotationAngle = Math.atan2(Math.cos(supercoilAngle), 0);
        const rotatedX = localX * Math.cos(rotationAngle) - localZ * Math.sin(rotationAngle);
        const rotatedZ = localX * Math.sin(rotationAngle) + localZ * Math.cos(rotationAngle);
        
        // 最終點位置
        const x = pathX + rotatedX;
        const y = pathY;
        const z = pathZ + rotatedZ;
        
        points.push(new THREE.Vector3(x, y, z));
    }
    
    // 如果需要更多的扭曲度，可以添加一個後處理步驟
    // 根據圖片，整體結構在中間還有一個交叉
    for (let i = 0; i < points.length; i++) {
        const t = i / points.length;
        // 增加額外的彎曲使中間部分交叉
        const bendFactor = Math.sin(t * Math.PI) * 1.8;
        points[i].z += bendFactor;
    }
    
    // 保存曲線供其它層次使用
    const curve = new THREE.CatmullRomCurve3(points);
    dnaStructure.chromosome.curve = curve;
    
    // 創建染色體DNA螺旋，使用較細的管徑以匹配電話線效果
    const geometry = new THREE.TubeGeometry(curve, 800, 0.18, 8, false);
    const chromosomeMesh = new THREE.Mesh(geometry, dnaMaterial);
    dnaStructure.chromosome.group.add(chromosomeMesh);

    scene.add(dnaStructure.chromosome.group);
}

// --- 創建核小體 (DNA + 組蛋白) ---
function createNucleosomes() {
    dnaStructure.nucleosomes.group = new THREE.Group();
    dnaStructure.nucleosomes.positions = []; // 重置位置數組
    
    const histoneMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00, 
        roughness: 0.8,
        transparent: true 
    });
    
    const dnaMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff8888, 
        roughness: 0.6,
        transparent: true 
    });

    const histoneGeometry = new THREE.SphereGeometry(1, 16, 16); // 組蛋白核心
    
    // 為了創建連續的DNA線，我們需要一個完整的路徑
    const dnaPoints = [];
    const nucleosomeCount = dnaStructure.nucleosomes.count;
    
    // 沿著染色體曲線放置核小體
    for (let i = 0; i < nucleosomeCount; i++) {
        const nucleosome = new THREE.Group();
        
        // 計算核小體在染色體曲線上的位置
        const t = i / (nucleosomeCount - 1);
        const basePosition = dnaStructure.chromosome.curve.getPoint(t);
        
        // 保存核小體位置供DNA層次使用
        dnaStructure.nucleosomes.positions.push(basePosition.clone());
        
        // 添加組蛋白核心
        const histone = new THREE.Mesh(histoneGeometry, histoneMaterial);
        nucleosome.add(histone);
        
        // 為每個核小體創建環繞的DNA路徑點
        const wrappingPoints = 10; // 增加環繞點數以獲得更平滑的環繞
        const radius = 1.5; // 環繞半徑
        
        // 如果不是第一個核小體，添加連接前一個核小體的DNA段
        if (i > 0) {
            // 獲取前一個核小體的位置
            const prevPosition = dnaStructure.nucleosomes.positions[i-1];
            
            // 創建連接線 (簡化為直線)
            const connectorPoints = [];
            const steps = 5;
            
            for (let s = 0; s < steps; s++) {
                const alpha = s / steps;
                const x = prevPosition.x + (basePosition.x - prevPosition.x) * alpha;
                const y = prevPosition.y + (basePosition.y - prevPosition.y) * alpha;
                const z = prevPosition.z + (basePosition.z - prevPosition.z) * alpha;
                
                // 添加一些隨機波動使其看起來更自然
                const wave = Math.sin(alpha * Math.PI) * 0.5;
                connectorPoints.push(new THREE.Vector3(
                    x + wave * (Math.random() - 0.5),
                    y + wave * (Math.random() - 0.5),
                    z + wave * (Math.random() - 0.5)
                ));
            }
            
            // 添加到整體DNA路徑
            dnaPoints.push(...connectorPoints);
        }
        
        // 創建環繞組蛋白的DNA點
        for (let j = 0; j < wrappingPoints; j++) {
            const angle = (j / wrappingPoints) * Math.PI * 2;
            const heightOffset = (j / wrappingPoints) * 0.6 - 0.3; // 使DNA螺旋上升
            
            // 計算相對於組蛋白中心的環繞點
            const x = Math.cos(angle) * radius;
            const y = heightOffset;
            const z = Math.sin(angle) * radius;
            
            // 轉換為世界坐標並添加到基礎位置
            const point = new THREE.Vector3(
                basePosition.x + x,
                basePosition.y + y,
                basePosition.z + z
            );
            
            dnaPoints.push(point);
        }
        
        // 設置核小體位置
        nucleosome.position.copy(basePosition);
        
        // 添加到核小體群組
        dnaStructure.nucleosomes.group.add(nucleosome);
    }
    
    // 創建整個連續的DNA線
    const dnaCurve = new THREE.CatmullRomCurve3(dnaPoints);
    const dnaGeometry = new THREE.TubeGeometry(dnaCurve, 200, 0.2, 8, false);
    const dnaStrand = new THREE.Mesh(dnaGeometry, dnaMaterial);
    dnaStructure.nucleosomes.group.add(dnaStrand);

    scene.add(dnaStructure.nucleosomes.group);
}

// --- 創建 DNA 雙股螺旋 ---
// --- 创建 DNA 双股螺旋 (简化表示) ---
function createDNA() {
    dnaStructure.dna.group = new THREE.Group();
    
    // 材质定义
    const strandMaterial1 = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        roughness: 0.5, 
        transparent: true 
    }); // 红色链
    
    const strandMaterial2 = new THREE.MeshStandardMaterial({ 
        color: 0x0000ff, 
        roughness: 0.5, 
        transparent: true 
    }); // 蓝色链
    
    const basePairMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff00, 
        roughness: 0.8, 
        transparent: true 
    }); // 黄色碱基对

    // 仅创建一条DNA双螺旋，位于场景中心
    const radius = 0.5; // 螺旋半径
    const height = 10; // 螺旋总高度
    const turns = 5; // 螺旋圈数
    const segments = 100; // 每圈分段数
    const tubeRadius = 0.1; // 链的粗细
    const baseRadius = 0.05; // 碱基对的粗细

    const points1 = [];
    const points2 = [];
    const basePositions = [];

    for (let i = 0; i <= segments * turns; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const y = (i / (segments * turns)) * height - height / 2; // 从中间开始

        // 链 1
        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;
        points1.push(new THREE.Vector3(x1, y, z1));

        // 链 2 (相位差 180 度)
        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;
        points2.push(new THREE.Vector3(x2, y, z2));

        // 每隔一段添加碱基对连接点
        if (i % Math.floor(segments / 10) === 0) { // 每 1/10 圈加一个碱基对
            basePositions.push({ p1: new THREE.Vector3(x1, y, z1), p2: new THREE.Vector3(x2, y, z2) });
        }
    }

    // 创建链
    const curve1 = new THREE.CatmullRomCurve3(points1);
    const curve2 = new THREE.CatmullRomCurve3(points2);
    const geometry1 = new THREE.TubeGeometry(curve1, segments * turns, tubeRadius, 8, false);
    const geometry2 = new THREE.TubeGeometry(curve2, segments * turns, tubeRadius, 8, false);
    const strand1 = new THREE.Mesh(geometry1, strandMaterial1);
    const strand2 = new THREE.Mesh(geometry2, strandMaterial2);
    dnaStructure.dna.group.add(strand1);
    dnaStructure.dna.group.add(strand2);

    // 创建碱基对 (简化为圆柱体)
    basePositions.forEach(pos => {
        const direction = new THREE.Vector3().subVectors(pos.p2, pos.p1);
        const length = direction.length();
        const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, length, 8);
        const basePair = new THREE.Mesh(baseGeometry, basePairMaterial);

        // 定位和旋转圆柱体
        basePair.position.copy(pos.p1).add(direction.multiplyScalar(0.5)); // 放在两点中间
        basePair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); // Y 轴对准方向

        dnaStructure.dna.group.add(basePair);
    });

    // 保存一个参考位置，用于过渡动画
    dnaStructure.dna.positions = [{
        nucleosomeIndex: 0,
        position: new THREE.Vector3(0, 0, 0),
        segment: dnaStructure.dna.group
    }];

    scene.add(dnaStructure.dna.group);
}

// --- 處理縮放和層級切換 ---
function onControlsChange() {
    if (isTransitioning) return; // 如果正在過渡，則不進行檢查

    const distance = camera.position.distanceTo(controls.target);
    // console.log("Distance:", distance); // 調試用

    // --- 判斷縮放方向和層級 ---

    // Zoom In
    if (distance < zoomThresholds.toNucleosome && currentLevel === 'chromosome') {
        // 找到染色體上最接近目標點的位置
        const targetPoint = findClosestPointOnChromosome(controls.target);
        transitionToLevel('nucleosome', targetPoint);
    } else if (distance < zoomThresholds.toDna && currentLevel === 'nucleosome') {
        // 找到最接近目標點的核小體
        const closestNucleosome = findClosestNucleosome(controls.target);
        transitionToLevel('dna', closestNucleosome.position);
    }
    // Zoom Out
    else if (distance > zoomThresholds.toNucleosome && currentLevel === 'nucleosome') {
        transitionToLevel('chromosome', new THREE.Vector3(0, 0, 0));
    } else if (distance > zoomThresholds.toDna && currentLevel === 'dna') {
        // 找到對應DNA片段的核小體位置
        const nucleosomePosition = findNucleosomeForDNA(controls.target);
        transitionToLevel('nucleosome', nucleosomePosition);
    }
}

// 找到染色體曲線上最接近目標點的位置
function findClosestPointOnChromosome(targetPoint) {
    // 用於搜索曲線上最接近點的分段數
    const divisions = 100;
    let closestPoint = null;
    let minDistance = Infinity;
    
    // 沿曲線搜索最接近的點
    for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        const pointOnCurve = dnaStructure.chromosome.curve.getPoint(t);
        const distance = pointOnCurve.distanceTo(targetPoint);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = pointOnCurve;
        }
    }
    
    return closestPoint || new THREE.Vector3(0, 0, 0);
}

// 找到最接近目標點的核小體
function findClosestNucleosome(targetPoint) {
    let closestIndex = 0;
    let minDistance = Infinity;
    
    dnaStructure.nucleosomes.positions.forEach((position, index) => {
        const distance = position.distanceTo(targetPoint);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });
    
    return {
        index: closestIndex,
        position: dnaStructure.nucleosomes.positions[closestIndex]
    };
}

// 找到對應DNA片段的核小體位置
function findNucleosomeForDNA(targetPoint) {
    // 由于只有一个DNA双螺旋，我们需要找到最接近的核小体
    let closestIndex = 0;
    let minDistance = Infinity;
    
    dnaStructure.nucleosomes.positions.forEach((position, index) => {
        const distance = position.distanceTo(targetPoint);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });
    
    return dnaStructure.nucleosomes.positions[closestIndex] || new THREE.Vector3(0, 0, 0);
}

// --- 層級切換動畫 ---
function transitionToLevel(targetLevel, targetPoint) {
    if (isTransitioning || currentLevel === targetLevel) return;
    isTransitioning = true;
    console.log(`Transitioning from ${currentLevel} to ${targetLevel}`);

    const duration = 1.0; // 動畫持續時間 (秒)
    let targetGroupToShow, targetGroupToHide;
    let zoomLevel;
    let targetControlsTarget = targetPoint.clone(); // 新的觀察目標點

    // 確定要顯示/隱藏的群組和目標相機位置/縮放級別
    if (targetLevel === 'nucleosome') {
        targetGroupToShow = dnaStructure.nucleosomes.group;
        if (currentLevel === 'chromosome') {
            targetGroupToHide = dnaStructure.chromosome.group;
            zoomLevel = (zoomThresholds.toNucleosome + zoomThresholds.toDna) / 2; // 設置到核小體層級的典型距離
        } else { // 從 DNA 返回
            targetGroupToHide = dnaStructure.dna.group;
            zoomLevel = (zoomThresholds.toNucleosome + zoomThresholds.toDna) / 2;
        }
    } else if (targetLevel === 'dna') {
        targetGroupToShow = dnaStructure.dna.group;
        targetGroupToHide = dnaStructure.nucleosomes.group;
        zoomLevel = zoomThresholds.toDna / 2; // 设置到DNA层级的典型距离
        
        // 找到最接近的核小体作为DNA的目标位置
        const closestNucleosome = findClosestNucleosome(targetPoint);
        
        // 将DNA定位到该核小体位置
        dnaStructure.dna.group.position.copy(closestNucleosome.position);
        targetControlsTarget = closestNucleosome.position.clone();
    } else { // targetLevel === 'chromosome'
        targetGroupToShow = dnaStructure.chromosome.group;
        targetGroupToHide = currentLevel === 'nucleosome' ? 
                           dnaStructure.nucleosomes.group : 
                           dnaStructure.dna.group;
        targetControlsTarget = new THREE.Vector3(0, 0, 0);
        zoomLevel = (zoomThresholds.toNucleosome + controls.maxDistance) / 3; // 設置到染色體層級的典型距離
    }

    // 計算目標相機位置：保持當前方向，但調整距離
    const cameraDirection = camera.position.clone().sub(controls.target).normalize();
    const targetCameraPosition = targetControlsTarget.clone().add(cameraDirection.multiplyScalar(zoomLevel));

    // 確保目標群組可見以進行淡入
    targetGroupToShow.visible = true;
    prepareGroupForTransition(targetGroupToShow, 0); // 初始透明度為0
    prepareGroupForTransition(targetGroupToHide, 1); // 初始透明度為1

    // 使用 GSAP 創建動畫
    gsap.timeline({
        onComplete: () => {
            currentLevel = targetLevel;
            targetGroupToHide.visible = false; // 動畫結束後徹底隱藏舊群組
            isTransitioning = false;
            updateInfo();
            console.log(`Transition complete. Current level: ${currentLevel}`);
            // 恢復目標群組的透明度
            prepareGroupForTransition(targetGroupToShow, 1);
        }
    })
    .to(camera.position, { // 相機位置動畫
        x: targetCameraPosition.x,
        y: targetCameraPosition.y,
        z: targetCameraPosition.z,
        duration: duration,
        ease: "power2.inOut"
    }, 0)
    .to(controls.target, { // 控制器目標點動畫
        x: targetControlsTarget.x,
        y: targetControlsTarget.y,
        z: targetControlsTarget.z,
        duration: duration,
        ease: "power2.inOut",
        onUpdate: () => controls.update() // 持續更新控制器
    }, 0)
    .to({}, { // 群組淡出動畫
        duration: duration * 0.5,
        onUpdate: function() {
            const progress = this.progress();
            updateGroupOpacity(targetGroupToHide, 1 - progress);
        },
        ease: "power1.in"
    }, 0)
    .to({}, { // 群組淡入動畫
        duration: duration * 0.7,
        delay: duration * 0.3,
        onUpdate: function() {
            const progress = this.progress();
            updateGroupOpacity(targetGroupToShow, progress);
        },
        ease: "power1.out"
    }, 0);
}

// 準備群組進行透明度過渡
function prepareGroupForTransition(group, initialOpacity) {
    group.traverse(child => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    mat.transparent = true;
                    mat.opacity = initialOpacity;
                });
            } else {
                child.material.transparent = true;
                child.material.opacity = initialOpacity;
            }
        }
    });
}

// 更新群組透明度
function updateGroupOpacity(group, opacity) {
    group.traverse(child => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    mat.opacity = opacity;
                });
            } else {
                child.material.opacity = opacity;
            }
        }
    });
}

// --- 更新介面訊息 ---
function updateInfo() {
    let levelName = '';
    switch (currentLevel) {
        case 'chromosome': levelName = '染色體 (Chromosome)'; break;
        case 'nucleosome': levelName = '核小體 (Nucleosome)'; break;
        case 'dna': levelName = 'DNA 雙股螺旋'; break;
    }
    infoLevelText.textContent = levelName;
}

// --- 窗口大小調整 ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 動畫循環 ---
function animate() {
    requestAnimationFrame(animate);

    // 更新控制器 (如果啟用了阻尼，這一步是必須的)
    if (controls.enabled) {
        controls.update();
    }

    // 添加模型的自旋轉等動畫，根據當前層級選擇性地應用
    if (currentLevel === 'nucleosome' && dnaStructure.nucleosomes.group.visible) {
        dnaStructure.nucleosomes.group.rotation.y += 0.002;
        dnaStructure.nucleosomes.group.rotation.x += 0.001;
    }
    
    if (currentLevel === 'dna' && dnaStructure.dna.group.visible) {
        dnaStructure.dna.group.rotation.y += 0.003;
    }

    renderer.render(scene, camera);
}

// --- 啟動 ---
init();