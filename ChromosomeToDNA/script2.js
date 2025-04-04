// --- 基本設定 ---
let scene, camera, renderer, controls;
let container, infoLevelText, loadingElement;

// --- 物件群組 ---
let chromosomeGroup, nucleosomeGroup, dnaGroup;

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
    nucleosomeGroup.visible = false;
    dnaGroup.visible = false;

    // --- 事件監聽 ---
    window.addEventListener('resize', onWindowResize, false);
    controls.addEventListener('change', onControlsChange); // 監聽控制器變化 (包含縮放)

    // --- 隱藏載入提示 ---
    loadingElement.style.display = 'none';

    // --- 開始動畫循環 ---
    animate();
}

// --- 創建染色體 (簡化表示) ---
function createChromosome() {
    chromosomeGroup = new THREE.Group();
    
    // 創建染色體DNA材質
    const dnaMaterial = new THREE.MeshStandardMaterial({
        color: 0xff8888, // 紅色DNA
        roughness: 0.6,
        metalness: 0.1,
        wireframe: false
    });

    // 創建一個緊密纏繞的DNA螺旋來形成棒狀染色體
    const points = [];
    const height = 20; // 染色體高度
    const radius = 1.2; // 基本半徑
    const turns = 40; // 螺旋纏繞次數（增加以獲得更緊密的外觀）
    const pointCount = turns * 20; // 足夠的點以獲得平滑曲線
    
    // 創建高密度螺旋形狀以模擬緊密纏繞的DNA
    for (let i = 0; i < pointCount; i++) {
        const t = i / pointCount;
        const angle = t * Math.PI * 2 * turns;
        
        // 螺旋半徑有些微變化以增加自然感
        const currentRadius = radius * (1 + Math.sin(t * Math.PI * 10) * 0.1);
        
        const x = currentRadius * Math.sin(angle);
        const y = height * (t - 0.5); // 讓染色體位於中心
        const z = currentRadius * Math.cos(angle);
        
        points.push(new THREE.Vector3(x, y, z));
    }
    
    // 創建染色體DNA螺旋
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 400, 0.3, 8, false); // 減小管徑以表示DNA線
    const chromosomeMesh = new THREE.Mesh(geometry, dnaMaterial);
    chromosomeGroup.add(chromosomeMesh);

    scene.add(chromosomeGroup);
    
    // 返回曲線供核小體使用
    return curve;
}

// --- 創建核小體 (DNA + 組蛋白) 使用連續的DNA線 ---
function createNucleosomes() {
    nucleosomeGroup = new THREE.Group();
    const histoneMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, roughness: 0.8 }); // 綠色組蛋白
    const dnaMaterial = new THREE.MeshStandardMaterial({ color: 0xff8888, roughness: 0.6 }); // 紅色DNA

    const histoneGeometry = new THREE.SphereGeometry(1, 16, 16); // 組蛋白核心
    
    // 獲取染色體曲線作為參考
    const chromosomeCurve = createChromosome();
    
    // 為了創建連續的DNA線，我們需要一個完整的路徑
    const dnaPoints = [];
    const nucleosomeCount = 8;
    
    // 沿著染色體曲線放置核小體，並創建連續DNA路徑
    for (let i = 0; i < nucleosomeCount; i++) {
        const nucleosome = new THREE.Group();
        
        // 計算核小體在染色體上的位置
        const t = i / (nucleosomeCount - 1);
        const basePosition = chromosomeCurve.getPoint(t);
        
        // 添加組蛋白核心
        const histone = new THREE.Mesh(histoneGeometry, histoneMaterial);
        histone.position.copy(basePosition);
        nucleosome.add(histone);
        
        // 為每個核小體創建環繞的DNA路徑點
        const wrappingPoints = 16; // 環繞點數
        const radius = 1.2; // 環繞半徑
        
        // 如果不是第一個核小體，添加連接前一個核小體的DNA段
        if (i > 0) {
            // 獲取前一個核小體的最後位置
            const prevPosition = chromosomeCurve.getPoint((i - 1) / (nucleosomeCount - 1));
            
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
            
            // 計算環繞點
            const x = basePosition.x + Math.cos(angle) * radius;
            const y = basePosition.y + heightOffset;
            const z = basePosition.z + Math.sin(angle) * radius;
            
            dnaPoints.push(new THREE.Vector3(x, y, z));
        }
        
        // 微調核小體位置以適應曲線
        nucleosome.position.copy(basePosition);
        
        // 添加到核小體群組
        nucleosomeGroup.add(nucleosome);
    }
    
    // 創建整個連續的DNA線
    const dnaCurve = new THREE.CatmullRomCurve3(dnaPoints);
    const dnaGeometry = new THREE.TubeGeometry(dnaCurve, 200, 0.2, 8, false);
    const dnaStrand = new THREE.Mesh(dnaGeometry, dnaMaterial);
    nucleosomeGroup.add(dnaStrand);

    scene.add(nucleosomeGroup);
}
// --- 創建 DNA 雙股螺旋 (簡化表示) ---
function createDNA() {
    dnaGroup = new THREE.Group();
    const strandMaterial1 = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 }); // 紅色鏈
    const strandMaterial2 = new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.5 }); // 藍色鏈
    const basePairMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.8 }); // 黃色鹼基對

    const radius = 0.5; // 螺旋半徑
    const height = 10; // 螺旋總高度
    const turns = 5; // 螺旋圈數
    const segments = 100; // 每圈分段數
    const tubeRadius = 0.1; // 鏈的粗細
    const baseRadius = 0.05; // 鹼基對的粗細

    const points1 = [];
    const points2 = [];
    const basePositions = [];

    for (let i = 0; i <= segments * turns; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const y = (i / (segments * turns)) * height - height / 2; // 從中間開始

        // 鏈 1
        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;
        points1.push(new THREE.Vector3(x1, y, z1));

        // 鏈 2 (相位差 180 度)
        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;
        points2.push(new THREE.Vector3(x2, y, z2));

        // 每隔一段添加鹼基對連接點 (簡化)
        if (i % Math.floor(segments / 10) === 0) { // 每 1/10 圈加一個鹼基對
             basePositions.push({ p1: new THREE.Vector3(x1, y, z1), p2: new THREE.Vector3(x2, y, z2) });
        }
    }

    // 創建鏈
    const curve1 = new THREE.CatmullRomCurve3(points1);
    const curve2 = new THREE.CatmullRomCurve3(points2);
    const geometry1 = new THREE.TubeGeometry(curve1, segments * turns, tubeRadius, 8, false);
    const geometry2 = new THREE.TubeGeometry(curve2, segments * turns, tubeRadius, 8, false);
    const strand1 = new THREE.Mesh(geometry1, strandMaterial1);
    const strand2 = new THREE.Mesh(geometry2, strandMaterial2);
    dnaGroup.add(strand1);
    dnaGroup.add(strand2);

    // 創建鹼基對 (簡化為圓柱體)
    basePositions.forEach(pos => {
        const direction = new THREE.Vector3().subVectors(pos.p2, pos.p1);
        const length = direction.length();
        const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, length, 8);
        const basePair = new THREE.Mesh(baseGeometry, basePairMaterial);

        // 定位和旋轉圓柱體
        basePair.position.copy(pos.p1).add(direction.multiplyScalar(0.5)); // 放在兩點中間
        basePair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); // Y 軸對準方向

        dnaGroup.add(basePair);
    });


    scene.add(dnaGroup);
}


// --- 處理縮放和層級切換 ---
function onControlsChange() {
    if (isTransitioning) return; // 如果正在過渡，則不進行檢查

    const distance = camera.position.distanceTo(controls.target);
    // console.log("Distance:", distance); // 調試用

    // --- 判斷縮放方向和層級 ---

    // Zoom In
    if (distance < zoomThresholds.toNucleosome && currentLevel === 'chromosome') {
        transitionToLevel('nucleosome');
    } else if (distance < zoomThresholds.toDna && currentLevel === 'nucleosome') {
        transitionToLevel('dna');
    }
    // Zoom Out
    else if (distance > zoomThresholds.toNucleosome && currentLevel === 'nucleosome') {
        transitionToLevel('chromosome');
    } else if (distance > zoomThresholds.toDna && currentLevel === 'dna') {
         transitionToLevel('nucleosome');
    }
}

// --- 層級切換動畫 ---
function transitionToLevel(targetLevel) {
    if (isTransitioning || currentLevel === targetLevel) return;
    isTransitioning = true;
    console.log(`Transitioning from ${currentLevel} to ${targetLevel}`);

    const duration = 1.0; // 動畫持續時間 (秒)
    let targetCameraPosition = new THREE.Vector3();
    let targetControlsTarget = new THREE.Vector3(0, 0, 0); // 新的觀察目標點
    let targetGroupToShow, targetGroupToHide;
    let zoomLevel;

    // 確定要顯示/隱藏的群組和目標相機位置/縮放級別
    if (targetLevel === 'nucleosome') {
        targetGroupToShow = nucleosomeGroup;
        if (currentLevel === 'chromosome') {
            targetGroupToHide = chromosomeGroup;
            zoomLevel = (zoomThresholds.toNucleosome + zoomThresholds.toDna) / 2; // 設置到核小體層級的典型距離
             // 可以隨機選擇一個核小體的位置作為目標，或者保持 (0,0,0)
            // targetControlsTarget = nucleosomeGroup.children[0].position.clone();
        } else { // 從 DNA 返回
            targetGroupToHide = dnaGroup;
            zoomLevel = (zoomThresholds.toNucleosome + zoomThresholds.toDna) / 2;
        }
    } else if (targetLevel === 'dna') {
        targetGroupToShow = dnaGroup;
        targetGroupToHide = nucleosomeGroup;
        zoomLevel = zoomThresholds.toDna / 2; // 設置到DNA層級的典型距離
        // 可以設置目標為DNA的中心
        // targetControlsTarget = dnaGroup.position.clone(); // 如果 DNA Group 有特定位置
    } else { // targetLevel === 'chromosome'
        targetGroupToShow = chromosomeGroup;
        targetGroupToHide = nucleosomeGroup;
        zoomLevel = (zoomThresholds.toNucleosome + controls.maxDistance) / 3; // 設置到染色體層級的典型距離
    }

    // 計算目標相機位置：保持當前方向，但調整距離
    targetCameraPosition = camera.position.clone().normalize().multiplyScalar(zoomLevel);

     // 確保目標群組可見以進行淡入
    targetGroupToShow.visible = true;
    if (targetGroupToShow.children.length > 0 && targetGroupToShow.children[0].material) {
         gsap.set(targetGroupToShow.children, { opacity: 0 }); // 初始透明度為0 (假設所有子物件都有材質)
         // 更健壯的方式是遍歷設置透明度
         targetGroupToShow.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.transparent = true; // 必須設置為 true 才能控制 opacity
                child.material.opacity = 0;
            }
        });
    }


    // 使用 GSAP 創建動畫
    gsap.timeline({
        onComplete: () => {
            currentLevel = targetLevel;
            targetGroupToHide.visible = false; // 動畫結束後徹底隱藏舊群組
            isTransitioning = false;
            updateInfo();
            console.log(`Transition complete. Current level: ${currentLevel}`);
             // 恢復目標群組的透明度（如果之前設置過）
             targetGroupToShow.traverse(child => {
                 if (child.isMesh && child.material) {
                     child.material.opacity = 1;
                    // 可以選擇性地將 transparent 設回 false 以提高性能，但如果後續還需淡出則保留 true
                    // child.material.transparent = false;
                 }
             });
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
    .to(targetGroupToHide.children, { // 舊群組淡出 (假設子物件有材質)
        opacity: 0,
        duration: duration * 0.5, // 較快淡出
        ease: "power1.in",
        stagger: 0.01, // 可以稍微錯開動畫
        onStart: () => {
             targetGroupToHide.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.transparent = true;
                }
            });
        }
    }, 0)
     .to(targetGroupToShow.children, { // 新群組淡入
        opacity: 1,
        duration: duration * 0.7, // 較慢淡入
        ease: "power1.out",
        stagger: 0.01,
        delay: duration * 0.3 // 在舊群組開始淡出後再開始淡入
    }, 0);

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

    // 在這裡可以添加模型的自旋轉等動畫
    // if (chromosomeGroup && chromosomeGroup.visible) {
    //     chromosomeGroup.rotation.y += 0.001;
    // }
     if (nucleosomeGroup && nucleosomeGroup.visible) {
         nucleosomeGroup.rotation.y += 0.002;
         nucleosomeGroup.rotation.x += 0.001;
     }
    // if (dnaGroup && dnaGroup.visible) {
    //      dnaGroup.rotation.y += 0.005;
    // }


    renderer.render(scene, camera);
}

// --- 啟動 ---
init();