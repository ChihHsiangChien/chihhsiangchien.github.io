import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

// --- 場景基本設定 ---
// --- UI: 增加縱切/橫切 slider ---
const uiDiv = document.createElement('div');
uiDiv.style.position = 'fixed';
uiDiv.style.top = '10px';
uiDiv.style.left = '10px';
uiDiv.style.zIndex = '10';
uiDiv.style.background = 'rgba(30,30,30,0.8)';
uiDiv.style.padding = '10px';
uiDiv.style.borderRadius = '8px';
uiDiv.style.color = '#fff';
uiDiv.innerHTML = `
    <div style="margin-bottom:6px;">
        <label for="clipZ">橫切 (Z): </label>
        <input type="range" id="clipZ" min="-10" max="10" step="0.01" value="4">
        <span id="clipZValue">0</span>
    </div>
    <div style="margin-bottom:6px;">
        <label for="clipY">縱切 (Y): </label>
        <input type="range" id="clipY" min="-10" max="10" step="0.01" value="4">
        <span id="clipYValue">0</span>
    </div>
    <div>
        <label for="levelSlider">等值面 level: </label>
        <input type="range" id="levelSlider" min="1" max="20" step="0.01" value="8">
        <span id="levelValue">8</span>
    </div>
`;
document.body.appendChild(uiDiv);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 加入 OrbitControls 以便拖曳旋轉
const controls = new OrbitControls(camera, renderer.domElement);

// 設定相機位置
camera.position.z = 10;


// --- 裁切平面 ---
const clipYPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 4); 
const clipZPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 4);
renderer.localClippingEnabled = true;

// --- 燈光設定 ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // 更亮的環境光
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // 更亮的平行光
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// 增加一個強白色點光源
const pointLight = new THREE.PointLight(0xffffff, 2, 100);
pointLight.position.set(0, 5, 10);
scene.add(pointLight);

// --- 產生粒線體外膜 ---
function createOuterMembrane() {
    const geometry = new THREE.SphereGeometry(3, 64, 64);
    // 透過 scale 讓球體變橢圓
    geometry.scale(2, 1, 1);
    const material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    const outerMembrane = new THREE.Mesh(geometry, material);
    return outerMembrane;
}
const outerMembrane = createOuterMembrane();

// 設定clippingPlanes
outerMembrane.material.clippingPlanes = [clipYPlane, clipZPlane];
//scene.add(outerMembrane);

// --- 產生隨機遊走的內膜管子 ---
function createInnerMembrane() {
    // Marching Cubes/Metaballs 實現
    // 產生螺旋形球心
    const points = [];
    const N = 80;
    // XY平面上的高頻率sin波路徑
    const freq = 10; // 頻率
    const amp = 2.2; // 振幅
    const centerY = 0;
    const centerX = 0;
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const angle = 2 * Math.PI * t;
        const x = centerX + amp * Math.sin(freq * angle);
        const y = centerY + amp * Math.cos(freq * angle);
        //const z = -2.5 + 5.0 * t; // 緩慢前進z軸
        const z = 0 ; // 緩慢前進z軸
        points.push(new THREE.Vector3(x, y, z));
    }
    // Marching Cubes 設定
    const resolution = 40;
    const size = 8.0;
    const field = new Float32Array(resolution * resolution * resolution);
    const sphereRadius = 1.1;
    // 填入 Metaball 場
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            for (let k = 0; k < resolution; k++) {
                // 計算座標
                const px = (i / (resolution - 1) - 0.5) * size * 1.0;
                const py = (j / (resolution - 1) - 0.5) * size * 1.0;
                const pz = (k / (resolution - 1) - 0.5) * size * 1.0;
                let value = 0;
                for (let p = 0; p < points.length; p++) {
                    const dx = px - points[p].x;
                    const dy = py - points[p].y;
                    const dz = pz - points[p].z;
                    const r2 = dx*dx + dy*dy + dz*dz;
                    value += sphereRadius * sphereRadius / (r2 + 0.2);
                }
                field[i*resolution*resolution + j*resolution + k] = value;
            }
        }
    }
    // Marching Cubes 幾何
    function marchingCubes(field, res, level, size) {
        const mc = new MarchingCubes(res, new THREE.MeshStandardMaterial({
            color: 0xff4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
        }), true, true);
        mc.isolation = level;
        mc.field = field;
        mc.position.set(0, 0, 0);
        mc.scale.set(size, size, size);
        mc.update();  
        return mc;
    }
    // 預設level
    const defaultLevel = 8;
    return marchingCubes(field, resolution, defaultLevel, size);
}

let innerMembrane = createInnerMembrane();

// 設定clippingPlanes給 MarchingCubes 的 material
if (innerMembrane.material) {
    innerMembrane.material.clippingPlanes = [clipYPlane, clipZPlane];
    
}
//outerMembrane.add(innerMembrane); // 將內膜加到外膜內，方便管理
scene.add(innerMembrane);

// --- 連接 level slider ---
const levelSlider = document.getElementById('levelSlider');
const levelValue = document.getElementById('levelValue');
levelValue.textContent = levelSlider.value;
levelSlider.addEventListener('input', function() {
    // 重新產生 marching cubes
    const newLevel = parseFloat(levelSlider.value);
    levelValue.textContent = levelSlider.value;
    if (innerMembrane) {
        innerMembrane.isolation = newLevel;
        innerMembrane.update();
    }
});


// --- 連接 slider ---
const clipYSlider = document.getElementById('clipY');
const clipZSlider = document.getElementById('clipZ');
const clipYValue = document.getElementById('clipYValue');
const clipZValue = document.getElementById('clipZValue');
clipYSlider.addEventListener('input', function() {
    clipYPlane.constant = parseFloat(clipYSlider.value);
    clipYValue.textContent = clipYSlider.value;
});
clipZSlider.addEventListener('input', function() {
    clipZPlane.constant = parseFloat(clipZSlider.value);
    clipZValue.textContent = clipZSlider.value;
});
// 初始化
clipYPlane.constant = parseFloat(clipYSlider.value);
clipZPlane.constant = parseFloat(clipZSlider.value);
clipYValue.textContent = clipYSlider.value;
clipZValue.textContent = clipZSlider.value;

// --- 動畫循環 ---
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // 讓 OrbitControls 持續更新
    renderer.render(scene, camera);
    // log 內膜是否在場景中
    if (innerMembrane.parent) {
        // 只 log 一次
        if (!animate.logged) {
            console.log('innerMembrane parent:', innerMembrane.parent);
            animate.logged = true;
        }
    }
}
animate();

// --- 響應式處理 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});